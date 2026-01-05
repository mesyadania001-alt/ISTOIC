
import React, { useState, useEffect, useRef } from 'react';
import { 
    Server, ScanLine, RefreshCw, 
    Fingerprint, Activity, ArrowRight, ShieldCheck,
    QrCode, Clipboard, Camera, X, Check, Loader2, Lock
} from 'lucide-react';

interface IStokAuthProps {
    identity: string;
    onRegenerateIdentity: () => void;
    onHost: () => void;
    onJoin: (targetId: string, pin: string) => void;
    errorMsg?: string;
    onErrorClear: () => void;
    isRelayActive: boolean;
    forcedMode?: 'DEFAULT' | 'JOIN';
    connectionStage?: string; // Passed from parent
}

export const IStokAuth: React.FC<IStokAuthProps> = ({ 
    identity, 
    onRegenerateIdentity, 
    onHost, 
    onJoin,
    errorMsg,
    onErrorClear,
    isRelayActive,
    forcedMode = 'DEFAULT',
    connectionStage = 'IDLE'
}) => {
    const [targetId, setTargetId] = useState('');
    const [pin, setPin] = useState('');
    const [isJoining, setIsJoining] = useState(forcedMode === 'JOIN');
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<any>(null);

    // Glitch effect only for Host mode visual
    const [glitchedIdentity, setGlitchedIdentity] = useState(identity);

    const isConnecting = connectionStage !== 'IDLE' && connectionStage !== 'SECURE';

    useEffect(() => {
        if (forcedMode === 'DEFAULT') {
            let interval: any;
            if (identity) {
                let iteration = 0;
                const original = identity;
                const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                
                interval = setInterval(() => {
                    setGlitchedIdentity(
                        original
                        .split("")
                        .map((letter, index) => {
                            if (index < iteration) return original[index];
                            return letters[Math.floor(Math.random() * 26)];
                        })
                        .join("")
                    );
                    if (iteration >= original.length) clearInterval(interval);
                    iteration += 1 / 3;
                }, 30);
            }
            return () => clearInterval(interval);
        } else {
            setGlitchedIdentity(identity);
        }
    }, [identity, forcedMode]);

    useEffect(() => {
        if (forcedMode === 'JOIN') setIsJoining(true);
    }, [forcedMode]);

    // --- PASTE HANDLER ---
    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) setTargetId(text.trim());
        } catch (err) {
            console.error('Clipboard failed', err);
            // Fallback for non-secure contexts
            const input = document.getElementById('target-id-input') as HTMLInputElement;
            input?.focus();
            document.execCommand('paste');
        }
    };

    // --- QR SCANNER LOGIC ---
    const startScanner = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            streamRef.current = stream;
            setIsScanning(true);
            
            // Native Barcode Detection (Chrome/Android)
            if ('BarcodeDetector' in window) {
                const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                scanIntervalRef.current = setInterval(async () => {
                    if (videoRef.current) {
                        try {
                            const barcodes = await detector.detect(videoRef.current);
                            if (barcodes.length > 0) {
                                const rawValue = barcodes[0].rawValue;
                                processScannedData(rawValue);
                            }
                        } catch (e) {}
                    }
                }, 500);
            } else {
                // TODO: Add fallback JS QR library here if needed
                console.warn("Native BarcodeDetector not supported.");
                alert("Browser does not support native QR scanning. Please enter ID manually.");
                stopScanner();
            }
        } catch (err) {
            console.error("Camera error", err);
            alert("Tidak dapat mengakses kamera. Pastikan izin diberikan.");
        }
    };

    const stopScanner = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        setIsScanning(false);
    };

    const processScannedData = (data: string) => {
        if (navigator.vibrate) navigator.vibrate(200); // Haptic feedback on detection
        
        let foundId = '';
        let foundKey = '';

        // Try to parse IStok URL format: url/#connect=ID&key=PIN
        try {
            const urlObj = new URL(data);
            // Handle hash routing
            const hashParams = new URLSearchParams(urlObj.hash.replace('#', '?'));
            const connectId = hashParams.get('connect');
            const key = hashParams.get('key');
            
            if (connectId) foundId = connectId;
            if (key) foundKey = key;
        } catch (e) {
            // Not a URL, treat as raw ID?
            if (data.includes(':')) {
                // Maybe format ID:KEY?
                const parts = data.split(':');
                foundId = parts[0];
                foundKey = parts[1];
            } else {
                foundId = data;
            }
        }
        
        if (foundId) {
            setTargetId(foundId);
            if (foundKey) setPin(foundKey);
            
            stopScanner();
            
            // Auto-trigger if we have both
            if (foundId && foundKey) {
                setTimeout(() => onJoin(foundId, foundKey), 500);
            }
        }
    };

    useEffect(() => {
        if (isScanning && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isScanning]);

    // Cleanup on unmount
    useEffect(() => {
        return () => stopScanner();
    }, []);

    const handleJoinSubmit = () => {
        if (!targetId || pin.length < 4) return;
        onJoin(targetId, pin);
    };

    // --- VIEW: SCANNER OVERLAY ---
    if (isScanning) {
        return (
            <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
                <div className="flex-1 relative overflow-hidden">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover"
                    />
                    {/* Scanning Overlay UI */}
                    <div className="absolute inset-0 bg-black/30"></div>
                    
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-emerald-500/50 rounded-3xl animate-pulse flex items-center justify-center">
                        <div className="w-60 h-60 border border-emerald-500/20 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_20px_#10b981] animate-[scan_2s_linear_infinite]"></div>
                        </div>
                        {/* Corner Accents */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-xl"></div>
                    </div>

                    <div className="absolute top-12 w-full text-center px-4">
                        <div className="bg-black/60 text-white px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-xl inline-flex items-center gap-2">
                            <QrCode size={14} className="text-emerald-500"/> ALIGN QR CODE
                        </div>
                    </div>
                </div>
                <div className="p-8 bg-black flex justify-center pb-safe">
                    <button 
                        onClick={stopScanner}
                        className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20 active:scale-95 transition-all hover:bg-white/20"
                    >
                        <X size={24} />
                    </button>
                </div>
                <style>{`
                    @keyframes scan {
                        0% { top: 0%; opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { top: 100%; opacity: 0; }
                    }
                `}</style>
            </div>
        );
    }

    // --- VIEW: CLEAN JOIN FORM (Forced Mode) ---
    if (forcedMode === 'JOIN') {
        return (
            <div className="w-full max-w-md mx-auto p-6 animate-slide-up flex flex-col gap-6 relative">
                
                {/* Connecting Overlay */}
                {isConnecting && (
                    <div className="absolute inset-0 z-50 bg-[#09090b]/90 backdrop-blur-sm rounded-[32px] flex flex-col items-center justify-center text-center p-6 animate-fade-in">
                        <div className="relative mb-6">
                            <div className="w-20 h-20 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ShieldCheck size={24} className="text-blue-500 animate-pulse" />
                            </div>
                        </div>
                        <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1">
                            {connectionStage.replace('_', ' ')}
                        </h3>
                        <p className="text-xs font-mono text-neutral-400">Establishing secure handshake...</p>
                    </div>
                )}

                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30 shadow-[0_0_30px_rgba(37,99,235,0.2)]">
                        <ScanLine size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Gabung Sesi</h2>
                    <p className="text-neutral-400 text-xs font-medium">Masukkan ID Target atau Scan QR untuk terhubung.</p>
                </div>

                <div className="space-y-4">
                    {/* ID Input Group */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Target ID</label>
                        <div className="relative flex items-center">
                            <input 
                                id="target-id-input"
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                placeholder="Tempel ID disini..." 
                                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-neutral-600 pr-12"
                                autoFocus
                            />
                            <button 
                                onClick={handlePaste}
                                className="absolute right-3 p-2 text-neutral-500 hover:text-white bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                                title="Paste"
                            >
                                <Clipboard size={18} />
                            </button>
                        </div>
                    </div>

                    {/* PIN Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Akses PIN</label>
                        <div className="relative">
                            <input 
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="6-Digit PIN" 
                                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-sm font-mono text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-neutral-600 text-center tracking-[0.5em]"
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none" size={16} />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-5 gap-3 pt-2">
                        <button 
                            onClick={startScanner}
                            className="col-span-2 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <Camera size={18} /> SCAN
                        </button>
                        <button 
                            onClick={handleJoinSubmit}
                            disabled={!targetId || pin.length < 4}
                            className="col-span-3 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            CONNECT <ArrowRight size={16} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-red-500 text-xs font-medium animate-shake">
                        <ShieldCheck size={16} />
                        <span>{errorMsg}</span>
                        <button onClick={onErrorClear} className="ml-auto"><X size={14}/></button>
                    </div>
                )}
            </div>
        );
    }

    // --- VIEW: DEFAULT DASHBOARD ---
    return (
        <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto space-y-12 z-10">
            
            {/* HEADER */}
            <div className="text-center space-y-4 animate-slide-down">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">
                    <ShieldCheck size={12}/> TITANIUM RELAY PROTOCOL v0.52
                </div>
                <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase drop-shadow-2xl">
                    SECURE <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 animate-gradient-text">UPLINK</span>
                </h1>
                <p className="text-neutral-500 font-mono text-xs max-w-md mx-auto leading-relaxed">
                    AES-256 + FORCE TURN (TCP/443) + HYDRA-LINK HANDOVER. <br/>
                    {isRelayActive ? (
                        <span className="text-purple-400 flex items-center justify-center gap-2 mt-1">
                            <Activity size={10} className="animate-pulse"/> RELAY NODE ACTIVE
                        </span>
                    ) : (
                        <span className="text-neutral-600">RELAY OFFLINE (P2P ONLY)</span>
                    )}
                </p>
            </div>

            {/* IDENTITY CARD */}
            <div className="w-full max-w-md relative group animate-slide-up" style={{ animationDelay: '100ms' }}>
                <div className="bg-[#0a0a0b] border border-white/10 rounded-[32px] p-6 relative overflow-hidden ring-1 ring-white/5">
                    <div className="flex items-center justify-between relative z-10 mb-4">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-neutral-500">
                            <Fingerprint size={12} /> CURRENT_IDENTITY
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[9px] font-bold text-emerald-500 tracking-wider">MASKED</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex flex-col">
                            <h2 className="text-3xl md:text-4xl font-black text-white font-mono tracking-tight tabular-nums">
                                {glitchedIdentity}
                            </h2>
                            <p className="text-[8px] text-neutral-600 font-mono mt-1">
                                HASH: {Math.random().toString(36).substring(7).toUpperCase()}
                            </p>
                        </div>
                        <button onClick={onRegenerateIdentity} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all active:scale-95 border border-white/5 group/btn">
                            <RefreshCw size={20} className="group-hover/btn:rotate-180 transition-transform duration-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ACTION DECK */}
            <div className="w-full max-w-4xl z-10 animate-slide-up grid grid-cols-1 md:grid-cols-2 gap-6" style={{ animationDelay: '200ms' }}>
                <button onClick={onHost} className="group relative p-8 rounded-[32px] bg-zinc-900/50 border border-white/10 hover:border-emerald-500/50 transition-all duration-500 hover:bg-zinc-900 flex flex-col items-start gap-6 text-left ring-1 ring-transparent hover:ring-emerald-500/20 active:scale-[0.98]">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                        <Server size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2 group-hover:text-emerald-400 transition-colors">HOST FREQUENCY</h3>
                        <p className="text-xs text-neutral-400 font-medium leading-relaxed font-mono">Create a secure, encrypted room. You become the relay anchor.</p>
                    </div>
                    <div className="mt-auto flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                        INITIALIZE <ArrowRight size={12} />
                    </div>
                </button>

                <button onClick={() => setIsJoining(true)} className="group relative p-8 rounded-[32px] bg-zinc-900/50 border border-white/10 hover:border-blue-500/50 transition-all duration-500 hover:bg-zinc-900 flex flex-col items-start gap-6 text-left ring-1 ring-transparent hover:ring-blue-500/20 active:scale-[0.98]">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                        <ScanLine size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2 group-hover:text-blue-400 transition-colors">JOIN FREQUENCY</h3>
                        <p className="text-xs text-neutral-400 font-medium leading-relaxed font-mono">Connect to an existing anomaly. Requires ID & Access Key.</p>
                    </div>
                    <div className="mt-auto flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                        CONFIGURE <ArrowRight size={12} />
                    </div>
                </button>
            </div>
            
            {/* Fallback Join UI (Forced Mode inside Default) */}
            {isJoining && forcedMode === 'DEFAULT' && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
                    <div className="relative w-full max-w-md bg-[#09090b] border border-white/10 rounded-[32px] p-6 shadow-2xl">
                        <button onClick={() => setIsJoining(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white z-20"><X size={20}/></button>
                        <IStokAuth 
                            identity={identity} 
                            onRegenerateIdentity={onRegenerateIdentity} 
                            onHost={onHost} 
                            onJoin={onJoin} 
                            errorMsg={errorMsg} 
                            onErrorClear={onErrorClear} 
                            isRelayActive={isRelayActive} 
                            forcedMode="JOIN" 
                            connectionStage={connectionStage}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
