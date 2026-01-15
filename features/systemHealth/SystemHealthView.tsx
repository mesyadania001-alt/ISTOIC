import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  RefreshCw,
  ShieldCheck,
  Wifi,
  Stethoscope,
  CheckCircle2,
  ArrowRight,
  Terminal,
  Layers,
  Network,
  HardDrive,
  Server,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { debugService } from '../../services/debugService';
import { KEY_MANAGER, type ProviderStatus } from '../../services/geminiService';
import { HANISAH_KERNEL } from '../../services/melsaKernel';
import { speakWithHanisah } from '../../services/elevenLabsService';
import { type LogEntry } from '../../types';
import { executeMechanicTool } from '../mechanic/mechanicTools';
import { IntegrityMatrix } from './components/IntegrityMatrix';
import { useFeatures } from '../../contexts/FeatureContext';
import useLocalStorage from '../../hooks/useLocalStorage';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

// ─────────────────────────────────────────────────────────────
// CONSTANTS & UTILITIES
// ─────────────────────────────────────────────────────────────

const LABEL_CLASS = 'caption text-text-muted font-semibold';

const getStatusColor = (status: 'HEALTHY' | 'COOLDOWN' | 'UNHEALTHY') => {
  switch (status) {
    case 'HEALTHY':
      return {
        dot: 'bg-success',
        text: 'text-success',
        bg: 'bg-success/10',
        border: 'border-success/30',
      };
    case 'COOLDOWN':
      return {
        dot: 'bg-warning',
        text: 'text-warning',
        bg: 'bg-warning/10',
        border: 'border-warning/30',
      };
    case 'UNHEALTHY':
      return {
        dot: 'bg-danger',
        text: 'text-danger',
        bg: 'bg-danger/10',
        border: 'border-danger/30',
      };
  }
};

const getLatencyStatus = (latency: number) => {
  if (latency < 200) return 'HEALTHY';
  if (latency < 1000) return 'COOLDOWN';
  return 'UNHEALTHY';
};

// ─────────────────────────────────────────────────────────────
// LIVE SPARKLINE COMPONENT
// ─────────────────────────────────────────────────────────────

const LiveSparkline: React.FC<{ data: number[]; color?:  string }> = ({
  data,
  color = 'var(--accent)',
}) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math. min(...data);
  const range = max - min || 1;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((val - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className="w-full h-16" preserveAspectRatio="none" viewBox="0 0 100 100">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// ACTION BUTTON COMPONENT
// ─────────────────────────────────────────────────────────────

interface ActionButtonProps {
  label:  string;
  desc:  string;
  onClick: () => void;
  tone?: 'default' | 'accent';
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  desc,
  onClick,
  tone = 'default',
}) => {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  const handle = async () => {
    setState('loading');
    try {
      await onClick();
      setState('done');
      setTimeout(() => setState('idle'), 2000);
    } catch (e) {
      setState('idle');
    }
  };

  const colors =
    tone === 'accent'
      ? 'bg-accent/20 border-accent/50 hover:bg-accent/30 text-accent'
      : 'bg-surface-2/60 border-border/50 hover:bg-surface-2 text-text';

  return (
    <button
      onClick={handle}
      disabled={state !== 'idle'}
      className={`rounded-[var(--radius-lg)] border shadow-[var(--shadow-soft)] p-4 flex flex-col gap-2 items-start hover:-translate-y-0.5 transition-all disabled:opacity-50 ${colors}`}
    >
      <span className="body-sm font-semibold">{label}</span>
      <span className="caption text-text-muted">
        {state === 'done' ? 'Completed' :  state === 'loading' ? 'Processing.. .' : desc}
      </span>
      {state === 'loading' && (
        <RefreshCw size={14} className="animate-spin mt-1" />
      )}
      {state === 'done' && <CheckCircle2 size={14} className="text-success mt-1" />}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────
// PROVIDER CARD COMPONENT
// ─────────────────────────────────────────────────────────────

const ProviderCard: React.FC<{ provider: ProviderStatus }> = ({ provider }) => {
  const status = provider.status as 'HEALTHY' | 'COOLDOWN' | 'UNHEALTHY';
  const colors = getStatusColor(status);

  return (
    <Card padding="sm" className="border-border/70 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${colors.bg} border ${colors.border}`}>
            <Server size={14} className={colors.text} />
          </div>
          <div>
            <p className="body-sm font-semibold text-text">{provider.id}</p>
            <p className="caption text-text-muted">
              {status === 'HEALTHY' ? 'Operational' : status === 'COOLDOWN' ? 'Cooling down' : 'Issues detected'}
            </p>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
      </div>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN SYSTEMHEALTHVIEW COMPONENT
// ─────────────────────────────────────────────────────────────

export const SystemHealthView: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [health, setHealth] = useState<any>({
    avgLatency: 0,
    memoryMb: 0,
    errorCount: 0,
    storageBytes: 0,
  });
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const { features } = useFeatures();
  const [latencyHistory, setLatencyHistory] = useState<number[]>(
    new Array(30).fill(0)
  );
  const [memoryHistory, setMemoryHistory] = useState<number[]>(
    new Array(30).fill(0)
  );
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LOGS' | 'INTEGRITY'>(
    'OVERVIEW'
  );
  const [isScanning, setIsScanning] = useState(false);
  const [hanisahDiagnosis, setHanisahDiagnosis] = useState<string | null>(null);
  const [realPing, setRealPing] = useState<number | null>(null);
  const [logFilter, setLogFilter] = useState<string>('ALL');
  const [logSearch, setLogSearch] = useState<string>('');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [isStreamFrozen, setIsStreamFrozen] = useLocalStorage<boolean>(
    'kernel_stream_paused',
    false
  );
  const [cliInput, setCliInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  // ─── Storage Calculation ───
  const calcStorage = () => {
    try {
      let total = 0;
      for (const x in localStorage) {
        if (!Object.prototype.hasOwnProperty. call(localStorage, x)) continue;
        total += (localStorage[x]. length + x.length) * 2;
      }
      setHealth((prev:  any) => ({ ...prev, storageBytes: total }));
    } catch {
      /* ignore */
    }
  };

  // ─── Repair Actions ───
  const executeRepair = async (action: string) => {
    if (action === 'HARD_RESET') {
      if (confirm('This will refresh the app. Continue?')) {
        window.location.reload();
      }
      return;
    }
    await executeMechanicTool({ args: { action } });
    if (action === 'REFRESH_KEYS') setProviders(KEY_MANAGER.getAllProviderStatuses());
    if (action === 'OPTIMIZE_MEMORY') {
      calcStorage();
      setHealth(debugService.getSystemHealth());
    }
  };

  // ─── Ping Test ───
  const handlePing = async () => {
    setRealPing(null);
    const start = Date.now();
    try {
      await fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        cache: 'no-store',
      });
      setRealPing(Date.now() - start);
    } catch {
      setRealPing(-1);
    }
  };

  // ─── Diagnostics ───
  const runDiagnostics = async () => {
    setIsScanning(true);
    setHanisahDiagnosis(null);
    try {
      const toolResultJson = await executeMechanicTool({
        args: { action: 'GET_DIAGNOSTICS' },
      });
      const prompt = `Please review these system metrics and summarize health, anomalies, and next actions in clear language.\n\n${toolResultJson}`;
      const response = await HANISAH_KERNEL.execute(
        prompt,
        'gemini-3-flash-preview',
        []
      );
      setHanisahDiagnosis(response.text || 'No response generated.');
    } catch (e:  any) {
      setHanisahDiagnosis(`Diagnostics failed: ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // ─── CLI Command Handler ───
  const handleCliSubmit = async (e: React. FormEvent) => {
    e.preventDefault();
    const cmd = cliInput.trim().toLowerCase();
    setCliInput('');

    if (cmd === 'clear') {
      setLogs([]);
      debugService.clear();
    } else if (cmd === 'refresh') {
      setHealth(debugService.getSystemHealth());
      setProviders(KEY_MANAGER.getAllProviderStatuses());
    } else if (cmd === 'diagnose') {
      await runDiagnostics();
    } else if (cmd === 'reload') {
      if (confirm('Reload the app? ')) window.location.reload();
    }
  };

  // ─── Effects ───
  useEffect(() => {
    setLogs(debugService.getLogs());
    calcStorage();
    const unsubscribe = debugService.subscribe((newLogs) => {
      if (! isStreamFrozen) setLogs(newLogs);
    });

    let diagInterval: any = null;
    if (features.AUTO_DIAGNOSTICS) {
      setHealth(debugService.getSystemHealth());
      setProviders(KEY_MANAGER.getAllProviderStatuses());
      diagInterval = setInterval(() => {
        const h = debugService.getSystemHealth();
        setHealth(h);
        setProviders(KEY_MANAGER.getAllProviderStatuses());
        calcStorage();
        setLatencyHistory((prev) => [...prev.slice(1), h.avgLatency]);
        setMemoryHistory((prev) => [
          ...prev.slice(1),
          h.memoryMb || 0,
        ]);
      }, 2000);
    }

    return () => {
      unsubscribe();
      if (diagInterval) clearInterval(diagInterval);
    };
  }, [features.AUTO_DIAGNOSTICS, isStreamFrozen]);

  // ─── Auto-scroll Logs ───
  useEffect(() => {
    if (isAutoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isAutoScroll]);

  // ─── Filter & Search Logs ───
  const filteredLogs = logs.filter((log) => {
    const matchFilter = logFilter === 'ALL' || log.level === logFilter;
    const matchSearch =
      logSearch === '' ||
      log.message.toLowerCase().includes(logSearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  const healthStatus = getLatencyStatus(health.avgLatency);
  const healthColors = getStatusColor(healthStatus as any);

  return (
    <div className="h-full flex flex-col px-4 pt-[calc(env(safe-area-inset-top)+1. 5rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] md:px-8 lg:px-12 bg-bg text-text">
      <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col gap-6">
        {/* ═════════════════════════════════════════ HEADER ═════════════════════════════════════════ */}
        <header className="flex flex-col gap-4">
          <Card tone="translucent" className="p-6 border-border/60 shadow-[0_30px_100px_-60px_rgba(var(--accent-rgb),0.8)]">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="space-y-2">
                <p className={LABEL_CLASS}>System Status</p>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-text">
                  Health & Diagnostics
                </h1>
                <p className="body-sm text-text-muted">
                  Real-time monitoring of providers, latency, and system integrity. 
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${healthColors.bg} border ${healthColors.border}`}>
                  <div className={`w-2 h-2 rounded-full ${healthColors.dot}`} />
                  <span className={`text-sm font-semibold ${healthColors.text}`}>
                    {healthStatus === 'HEALTHY'
                      ? 'All Systems Operational'
                      :  healthStatus === 'COOLDOWN'
                      ? 'Some Issues Detected'
                      : 'Critical Issues'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-border/50">
              <div className="px-3 py-1.5 rounded-full bg-surface-2 text-xs font-semibold text-text flex items-center gap-2">
                <ShieldCheck size={13} /> {providers.length} providers
              </div>
              <div className="px-3 py-1.5 rounded-full bg-surface-2 text-xs font-semibold text-text flex items-center gap-2">
                <Wifi size={13} />{' '}
                {realPing !== null
                  ? realPing === -1
                    ? 'No connectivity'
                    : `${realPing}ms ping`
                  : 'Ping idle'}
              </div>
              <div className="px-3 py-1.5 rounded-full bg-surface-2 text-xs font-semibold text-text flex items-center gap-2">
                <Activity size={13} /> {logs.length} log entries
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex mt-4 pt-4 border-t border-border/50">
              <div className="flex gap-2 bg-surface border border-border rounded-[var(--radius-md)] p-1 shadow-[var(--shadow-soft)]">
                {[
                  { key: 'OVERVIEW', icon: <Activity size={14} />, label: 'Overview' },
                  { key:  'LOGS', icon: <Terminal size={14} />, label:  'Logs' },
                  { key: 'INTEGRITY', icon: <Layers size={14} />, label:  'Integrity' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-4 py-2 rounded-[var(--radius-sm)] caption font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'bg-accent text-text-invert shadow-[0_8px_16px_-4px_rgba(var(--accent-rgb),0.3)]'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {tab. icon}
                    {tab. label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </header>

        {/* ═════════════════════════════════════════ CONTENT ═════════════════════════════════════════ */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* ─── OVERVIEW TAB ─── */}
          {activeTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-y-auto pb-6 custom-scroll">
              <div className="lg:col-span-8 space-y-6">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Latency Card */}
                  <Card padding="sm" className="h-full border-border/70">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-md bg-accent/10">
                          <Network size={14} className="text-accent" />
                        </div>
                        <span className={LABEL_CLASS}>Latency</span>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${healthColors.dot}`} />
                    </div>
                    <p className="page-title text-text mt-2">{health.avgLatency || '—'} ms</p>
                    <LiveSparkline data={latencyHistory} />
                  </Card>

                  {/* Memory Card */}
                  <Card padding="sm" className="h-full border-border/70">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-md bg-warning/10">
                          <HardDrive size={14} className="text-warning" />
                        </div>
                        <span className={LABEL_CLASS}>Memory</span>
                      </div>
                    </div>
                    <p className="page-title text-text mt-2">{health.memoryMb ?  `${health.memoryMb}MB` : '—'}</p>
                    <LiveSparkline data={memoryHistory} color="var(--warning)" />
                  </Card>

                  {/* Ping Card */}
                  <Card padding="sm" className="h-full border-border/70">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-md bg-success/10">
                          <Wifi size={14} className="text-success" />
                        </div>
                        <span className={LABEL_CLASS}>Ping</span>
                      </div>
                      <button
                        onClick={handlePing}
                        className="p-1 hover:bg-surface-2 rounded transition-colors"
                        title="Test network ping"
                      >
                        <RefreshCw size={13} className="text-text-muted" />
                      </button>
                    </div>
                    <p className="page-title text-text mt-2">
                      {realPing !== null ? (realPing === -1 ? 'Error' : `${realPing}ms`) : '—'}
                    </p>
                  </Card>
                </div>

                {/* Providers Section */}
                <Card padding="md" className="border-border/70">
                  <div className="flex items-center gap-2 mb-4">
                    <Server size={16} className="text-text-muted" />
                    <h3 className="body-sm font-semibold text-text">API Providers</h3>
                  </div>
                  <div className="grid grid-cols-1 md: grid-cols-2 gap-3">
                    {providers.length > 0 ? (
                      providers.map((p) => <ProviderCard key={p. id} provider={p} />)
                    ) : (
                      <p className="caption text-text-muted col-span-full">
                        No providers loaded. 
                      </p>
                    )}
                  </div>
                </Card>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md: grid-cols-3 gap-4">
                  <ActionButton
                    label="Optimize Storage"
                    desc="Clear cached data"
                    onClick={() => executeRepair('OPTIMIZE_MEMORY')}
                  />
                  <ActionButton
                    label="Refresh Keys"
                    desc="Rotate API credentials"
                    onClick={() => executeRepair('REFRESH_KEYS')}
                  />
                  <ActionButton
                    label="Reload App"
                    desc="Restart session"
                    tone="accent"
                    onClick={() => executeRepair('HARD_RESET')}
                  />
                </div>
              </div>

              {/* Right Sidebar:  Diagnostics */}
              <div className="lg:col-span-4 space-y-4">
                <Card padding="md" className="flex flex-col h-full border-border/70">
                  <div className="flex items-center gap-2 mb-4">
                    <Stethoscope size={16} className="text-text-muted" />
                    <h3 className="body-sm font-semibold text-text">AI Diagnostics</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scroll mb-4">
                    {hanisahDiagnosis ?  (
                      <Markdown className="prose dark:prose-invert prose-sm max-w-none text-sm">
                        {hanisahDiagnosis}
                      </Markdown>
                    ) : (
                      <p className="caption text-text-muted">
                        Run diagnostics to see a summary. 
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={runDiagnostics}
                    disabled={isScanning}
                    className="w-full"
                    variant={isScanning ? 'subtle' : 'primary'}
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Running... 
                      </>
                    ) : (
                      <>
                        <Stethoscope size={14} />
                        Run Diagnostics
                      </>
                    )}
                  </Button>
                </Card>
              </div>
            </div>
          )}

          {/* ─── LOGS TAB ─── */}
          {activeTab === 'LOGS' && (
            <Card className="h-full flex flex-col border-border/70 overflow-hidden">
              {/* Log Controls */}
              <div className="p-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={LABEL_CLASS}>Activity Log</span>
                  <div className="flex gap-1 bg-surface border border-border rounded-md p-0.5">
                    {['ALL', 'INFO', 'WARN', 'ERROR']. map((level) => (
                      <button
                        key={level}
                        onClick={() => setLogFilter(level)}
                        className={`px-2.5 py-1 rounded caption font-semibold transition-colors ${
                          logFilter === level
                            ? 'bg-surface-2 text-text'
                            : 'text-text-muted hover:text-text'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search logs..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <button
                    onClick={() => setIsStreamFrozen(!isStreamFrozen)}
                    className="p-2 hover:bg-surface-2 rounded transition-colors"
                    title={isStreamFrozen ?  'Resume stream' : 'Pause stream'}
                  >
                    {isStreamFrozen ? (
                      <Eye size={16} className="text-text-muted" />
                    ) : (
                      <EyeOff size={16} className="text-text-muted" />
                    )}
                  </button>
                </div>
              </div>

              {/* Log List */}
              <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-2">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, idx) => {
                    const levelColor =
                      log.level === 'ERROR'
                        ? 'text-danger'
                        : log.level === 'WARN'
                        ? 'text-warning'
                        : 'text-success';
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-surface-2/50 border border-border/30 rounded-lg text-xs font-mono text-text-muted hover:bg-surface-2 transition-colors break-words"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] text-text-muted opacity-70 flex-shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className={`font-semibold flex-shrink-0 ${levelColor}`}>
                            [{log.level}]
                          </span>
                          <span className="flex-1 text-text">{log.message}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-full text-center">
                    <p className="caption text-text-muted">
                      {logSearch || logFilter !== 'ALL'
                        ? 'No matching logs.'
                        : 'No logs yet. '}
                    </p>
                  </div>
                )}
                <div ref={logEndRef} />
              </div>

              {/* CLI Input */}
              <form
                onSubmit={handleCliSubmit}
                className="border-t border-border p-4 flex items-center gap-2"
              >
                <span className="text-accent font-bold">{'>'}</span>
                <Input
                  value={cliInput}
                  onChange={(e) => setCliInput(e.target.value)}
                  placeholder="clear | refresh | diagnose | reload"
                  className="flex-1 text-sm"
                />
                <Button type="submit" size="sm" className="min-h-[40px]">
                  <ArrowRight size={12} />
                </Button>
              </form>
            </Card>
          )}

          {/* ─── INTEGRITY TAB ─── */}
          {activeTab === 'INTEGRITY' && (
            <div className="h-full overflow-y-auto custom-scroll pb-6">
              <Card className="border-border/70">
                <IntegrityMatrix />
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};