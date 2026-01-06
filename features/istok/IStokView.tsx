import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    encryptData, decryptData
} from '../../utils/crypto'; 
import { TeleponanView } from '../teleponan/TeleponanView';
import { activatePrivacyShield } from '../../utils/privacyShield';
import { 
    Send, Zap, ScanLine, Server,
    Mic, Menu, PhoneCall, 
    QrCode, Lock, Flame, 
    ArrowLeft, BrainCircuit, Sparkles,
    Wifi, WifiOff, Paperclip, Camera, Globe, Languages, Check, X,
    Activity, Radio, Globe2
} from 'lucide-react';

// --- IMPORTS ---
import useLocalStorage from '../../hooks/useLocalStorage';
import { OMNI_KERNEL } from '../../services/omniRace'; 
import { SidebarIStokContact, IStokSession, IStokProfile } from './components/SidebarIStokContact';
import { ShareConnection } from './components/ShareConnection'; 
import { ConnectionNotification } from './ConnectionNotification'; // IMPORT YANG BARU DIBUAT
import { CallNotification } from './components/CallNotification';
import { MessageBubble } from './components/MessageBubble'; 
import { QRScanner } from './components/QRScanner'; 
import { compressImage } from './components/gambar';
import { AudioMessagePlayer } from './components/vn'; 

// --- CONSTANTS ---
const CHUNK_SIZE = 16384; 
const HEARTBEAT_MS = 2000;
const RECONNECT_DELAY = 1000;

// Daftar Bahasa Professional
const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English (Pro)', icon: '🇺🇸' },
    { code: 'id', name: 'Indonesia (Formal)', icon: '🇮🇩' },
    { code: 'jp', name: 'Japanese (Keigo)', icon: '🇯🇵' },
    { code: 'cn', name: 'Mandarin (Biz)', icon: '🇨🇳' },
    { code: 'ru', name: 'Russian', icon: '🇷🇺' },
    { code: 'ar', name: 'Arabic (MSA)', icon: '🇸🇦' },
    { code: 'de', name: 'German', icon: '🇩🇪' },
    { code: 'fr', name: 'French', icon: '🇫🇷' },
];

// --- TYPES ---
interface Message {
    id: string;
    sender: 'ME' | 'THEM';
    type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'FILE';
    content: string; 
    timestamp: number;
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ';
    duration?: number;
    size?: number;
    fileName?: string; 
    isMasked?: boolean;
    mimeType?: string;
    ttl?: number; 
    isTranslated?: boolean;
    originalLang?: string;
}

type AppMode = 'SELECT' | 'HOST' | 'JOIN' | 'CHAT';
type ConnectionStage = 'IDLE' | 'LOCATING_PEER' | 'FETCHING_RELAYS' | 'VERIFYING_KEYS' | 'ESTABLISHING_TUNNEL' | 'AWAITING_APPROVAL' | 'SECURE' | 'RECONNECTING' | 'DISCONNECTED';

// --- SOUND & HAPTIC ---
const triggerHaptic = (ms: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
};

const playSound = (type: 'MSG_IN' | 'MSG_OUT' | 'CONNECT' | 'CALL_RING' | 'BUZZ' | 'AI_THINK' | 'TRANSLATE' | 'ERROR') => {
    try {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        
        const presets: any = {
            'MSG_IN': () => {
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
            },
            'CONNECT': () => {
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.2);
                osc.start(now); osc.stop(now + 0.2);
            }
        };
        
        if (presets[type]) presets[type]();
        else if (type === 'MSG_OUT') {
             osc.frequency.setValueAtTime(400, now);
             gain.gain.setValueAtTime(0.05, now);
             gain.gain.linearRampToValueAtTime(0, now + 0.05);
             osc.start(now); osc.stop(now + 0.05);
        }
    } catch(e) {}
};

// --- AGGRESSIVE ICE CONFIG ---
const getIceServers = async (): Promise<any[]> => {
    const publicIce = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ];

    try {
        const apiKey = import.meta.env.VITE_METERED_API_KEY;
        if (!apiKey) return publicIce;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`https://istoic.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) return publicIce;
        const turnServers = await response.json();
        return [...turnServers, ...publicIce];
    } catch (e) {
        return publicIce;
    }
};

// --- GLOBAL STATUS OVERLAY ---
const GlobalStatusOverlay = ({ stage, isOnline, ping }: { stage: ConnectionStage, isOnline: boolean, ping: number }) => {
    if (stage === 'IDLE' && !isOnline) return null;
    let bgColor = 'bg-neutral-900';
    let icon = <Activity size={14} className="animate-pulse"/>;
    let text = stage.replace('_', ' ');

    if (stage === 'SECURE' && isOnline) {
        bgColor = 'bg-emerald-950/90 border-emerald-500/30';
        icon = <Globe2 size={14} className="text-emerald-500"/>;
        text = `SECURE • ${ping}ms`;
    } else if (stage === 'RECONNECTING') {
        bgColor = 'bg-yellow-950/90 border-yellow-500/30';
        icon = <Radio size={14} className="text-yellow-500 animate-spin"/>;
        text = "SEARCHING...";
    } else if (stage === 'DISCONNECTED') {
        bgColor = 'bg-red-950/90 border-red-500/30';
        icon = <WifiOff size={14} className="text-red-500"/>;
        text = "OFFLINE";
    }

    return (
        <div className="fixed top-0 inset-x-0 z-[50] pointer-events-none flex justify-center pt-[max(env(safe-area-inset-top),0.5rem)]">
            <div className={`${bgColor} backdrop-blur-md border text-white px-3 py-1 rounded-full shadow-2xl flex items-center gap-2 text-[9px] font-bold tracking-widest uppercase mt-1`}>
                {icon} <span>{text}</span>
            </div>
        </div>
    );
};

// --- IStokInput Component ---
const IStokInput = React.memo(({ 
    onSend, onTyping, disabled, isRecording, recordingTime, 
    isVoiceMasked, onToggleMask, onStartRecord, onStopRecord, 
    onAttach, ttlMode, onToggleTtl, onAiAssist, isAiThinking,
    translateTarget, setTranslateTarget
}: any) => {
    const [text, setText] = useState('');
    const [showLangMenu, setShowLangMenu] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const insertText = (newText: string) => setText(newText);

    return (
        <div className="bg-[#09090b] border-t border-white/10 p-3 z-20 pb-[max(env(safe-area-inset-bottom),1rem)] relative">
            {showLangMenu && (
                <div className="absolute bottom-full left-4 mb-2 bg-[#121214] border border-white/10 rounded-xl p-2 shadow-2xl w-48 z-50">
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                        <button onClick={() => { setTranslateTarget(null); setShowLangMenu(false); }} className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-neutral-400 hover:bg-white/5"><X size={12} /> OFF (Original)</button>
                        {SUPPORTED_LANGUAGES.map(lang => (
                            <button key={lang.code} onClick={() => { setTranslateTarget(lang); setShowLangMenu(false); }} className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold ${translateTarget?.code === lang.code ? 'bg-blue-600 text-white' : 'text-neutral-300 hover:bg-white/5'}`}>
                                <span className="flex items-center gap-2">{lang.icon} {lang.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-2 px-1">
                 <div className="flex gap-2">
                     <button onClick={onToggleTtl} className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-black uppercase ${ttlMode > 0 ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-white/5 border-white/5 text-neutral-500'}`}>
                        <Flame size={10} /> {ttlMode > 0 ? `${ttlMode}s` : 'OFF'}
                     </button>
                     <button onClick={() => onAiAssist(text, insertText)} disabled={isAiThinking} className="flex items-center gap-1.5 px-2 py-1 rounded-full border bg-white/5 border-white/5 text-neutral-500 text-[9px] font-black uppercase">
                        {isAiThinking ? <Sparkles size={10} className="animate-spin" /> : <BrainCircuit size={10} />} AI DRAFT
                     </button>
                     <button onClick={() => setShowLangMenu(!showLangMenu)} className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-black uppercase ${translateTarget ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-neutral-500'}`}>
                        <Globe size={10} /> {translateTarget ? translateTarget.code : 'LANG'}
                     </button>
                 </div>
            </div>

            <div className="flex gap-2 items-end">
                <button onClick={onAttach} className="p-3 bg-white/5 rounded-full text-neutral-400"><Paperclip size={20}/></button>
                <div className="flex-1 bg-white/5 rounded-2xl px-4 py-3 border border-white/5 focus-within:border-emerald-500/30 transition-colors relative">
                    <input 
                        ref={inputRef}
                        value={text} 
                        onChange={e=>{setText(e.target.value); onTyping();}} 
                        onKeyDown={e=>e.key==='Enter'&&text.trim()&&(onSend(text),setText(''))} 
                        placeholder={isRecording ? "Recording..." : (translateTarget ? `Translating...` : "Message...")} 
                        className="w-full bg-transparent outline-none text-white text-sm placeholder:text-neutral-600" 
                        disabled={disabled||isRecording}
                    />
                </div>
                {text.trim() ? (
                    <button onClick={()=>{onSend(text); setText('');}} className="p-3 bg-emerald-600 rounded-full text-white shadow-lg"><Send size={20}/></button>
                ) : (
                    <button onMouseDown={onStartRecord} onMouseUp={onStopRecord} onTouchStart={onStartRecord} onTouchEnd={onStopRecord} className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/5 text-neutral-400'}`}><Mic size={20}/></button>
                )}
            </div>
        </div>
    );
});

// --- MAIN COMPONENT ---
export const IStokView: React.FC = () => {
    // STATE
    const [mode, setMode] = useState<AppMode>('SELECT');
    const [stage, setStage] = useState<ConnectionStage>('IDLE');
    const [errorMsg, setErrorMsg] = useState<string>('');
    
    // DATA
    const [myProfile] = useLocalStorage<IStokProfile>('istok_profile_v1', {
        id: `ISTOK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        username: `ANOMALY-${Math.floor(Math.random() * 9000) + 1000}`,
        created: Date.now()
    });
    const [sessions, setSessions] = useLocalStorage<IStokSession[]>('istok_sessions', []);
    
    // CONNECTION
    const [targetPeerId, setTargetPeerId] = useState<string>('');
    const [accessPin, setAccessPin] = useState<string>('');
    const [pendingJoin, setPendingJoin] = useState<{id:string, pin:string} | null>(null);
    const [pingLatency, setPingLatency] = useState(0);
    
    // UI FLAGS
    const [showSidebar, setShowSidebar] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [showCall, setShowCall] = useState(false);
    const [viewImage, setViewImage] = useState<string|null>(null);
    const [showScanner, setShowScanner] = useState(false);
    
    // CHAT & MEDIA
    const [messages, setMessages] = useState<Message[]>([]);
    const [isPeerOnline, setIsPeerOnline] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isVoiceMasked, setIsVoiceMasked] = useState(false);
    const [ttlMode, setTtlMode] = useState(0); 
    
    // AI
    const [isAiThinking, setIsAiThinking] = useState(false); 
    const [translateTarget, setTranslateTarget] = useState<any>(null);

    // NOTIFICATIONS (CRITICAL)
    const [incomingRequest, setIncomingRequest] = useState<any>(null);
    const [incomingCall, setIncomingCall] = useState<any>(null);

    // REFS
    const peerRef = useRef<any>(null);
    const connRef = useRef<any>(null);
    const pinRef = useRef(accessPin);
    const msgEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chunkBuffer = useRef<any>({});
    const heartbeatRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder|null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => { pinRef.current = accessPin; }, [accessPin]);
    useEffect(() => { msgEndRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

    // --- INITIALIZATION ---
    useEffect(() => {
        activatePrivacyShield();
        const url = new URL(window.location.href);
        const connect = url.searchParams.get('connect');
        const key = url.searchParams.get('key');
        if (connect && key) {
            setTargetPeerId(connect); setAccessPin(key); setMode('JOIN'); setPendingJoin({ id: connect, pin: key });
        }
    }, []);

    // --- LOGIC: NETWORK WATCHDOG ---
    const startHeartbeat = useCallback(() => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = setInterval(() => {
            if (!connRef.current) return;
            const iceState = connRef.current.peerConnection?.iceConnectionState;
            if (iceState === 'disconnected' || iceState === 'failed' || !connRef.current.open) {
                setIsPeerOnline(false); setStage('RECONNECTING');
                if (targetPeerId && mode === 'CHAT') joinSession(targetPeerId, pinRef.current);
            } else {
                connRef.current.send({ type: 'PING', time: Date.now() });
            }
        }, HEARTBEAT_MS);
    }, [targetPeerId, mode]);

    const handleDisconnect = useCallback(() => {
        setIsPeerOnline(false); setStage('DISCONNECTED'); playSound('ERROR');
        setTimeout(() => { if (targetPeerId && mode === 'CHAT') { setStage('RECONNECTING'); joinSession(targetPeerId, pinRef.current); }}, RECONNECT_DELAY);
    }, [targetPeerId, mode]);

    const handleData = useCallback(async (data: any, incomingConn?: any) => {
        if (data.type === 'CHUNK') {
            const { id, idx, total, chunk } = data;
            if(!chunkBuffer.current[id]) chunkBuffer.current[id] = { chunks: new Array(total), count:0, total };
            const buf = chunkBuffer.current[id];
            if(!buf.chunks[idx]) { buf.chunks[idx] = chunk; buf.count++; }
            if(buf.count === total) {
                const full = buf.chunks.join(''); delete chunkBuffer.current[id];
                handleData({type:'MSG', payload: full}, incomingConn);
            }
            return;
        }

        const currentPin = pinRef.current;
        if (data.type === 'REQ') {
            const json = await decryptData(data.payload, currentPin);
            if (json) {
                const req = JSON.parse(json);
                if (req.type === 'CONNECTION_REQUEST') {
                    setIncomingRequest({ peerId: incomingConn.peer, identity: req.identity, conn: incomingConn });
                    playSound('MSG_IN');
                }
            }
        }
        else if (data.type === 'RESP') {
            const json = await decryptData(data.payload, currentPin);
            if (json) {
                const res = JSON.parse(json);
                if (res.type === 'CONNECTION_ACCEPT') {
                    setStage('SECURE'); setMode('CHAT'); setIsPeerOnline(true); startHeartbeat(); playSound('CONNECT');
                }
            }
        }
        else if (data.type === 'MSG') {
            const json = await decryptData(data.payload, currentPin);
            if (json) {
                const msg = JSON.parse(json);
                setMessages(p => [...p, { ...msg, sender: 'THEM', status: 'READ' }]);
                playSound('MSG_IN');
            }
        }
        else if (data.type === 'PING') { 
            setIsPeerOnline(true); if(stage !== 'SECURE') setStage('SECURE');
            if (data.time) setPingLatency(Date.now() - data.time);
        }
    }, [startHeartbeat]);

    // --- PEER INIT ---
    useEffect(() => {
        let mounted = true;
        if (peerRef.current) return;
        const init = async () => {
            try {
                setStage('FETCHING_RELAYS');
                const iceServers = await getIceServers();
                const { Peer } = await import('peerjs');
                if (!mounted) return;
                const peer = new Peer(myProfile.id, { debug: 0, secure: true, config: { iceServers, sdpSemantics: 'unified-plan', iceCandidatePoolSize: 10 }});

                peer.on('open', () => { setStage('IDLE'); if (pendingJoin) { joinSession(pendingJoin.id, pendingJoin.pin); setPendingJoin(null); }});
                peer.on('connection', c => { c.on('data', d => handleData(d, c)); c.on('close', handleDisconnect); c.on('iceStateChanged', (s) => { if(s==='disconnected'||s==='failed') handleDisconnect(); });});
                peer.on('error', err => { if (err.type === 'peer-unavailable') { setErrorMsg("TARGET NOT FOUND"); setStage('IDLE'); } else if (err.type === 'disconnected' || err.type === 'network') { peer.reconnect(); setStage('RECONNECTING'); }});
                peerRef.current = peer;
            } catch (e) { setErrorMsg("INIT FAILED"); }
        };
        init();
        return () => { mounted = false; if(peerRef.current) peerRef.current.destroy(); clearInterval(heartbeatRef.current); };
    }, []);

    const joinSession = (id?: string, pin?: string) => {
        const target = id || targetPeerId; const key = pin || accessPin;
        if (!target || !key) return;
        if (!peerRef.current || peerRef.current.disconnected) { peerRef.current?.reconnect(); setPendingJoin({id: target, pin: key}); return; }
        setStage('LOCATING_PEER');
        const conn = peerRef.current.connect(target, { reliable: true, serialization: 'binary' });
        conn.on('open', async () => {
            setStage('VERIFYING_KEYS'); connRef.current = conn;
            const payload = JSON.stringify({ type: 'CONNECTION_REQUEST', identity: myProfile.username });
            const encrypted = await encryptData(payload, key);
            if (encrypted) { conn.send({ type: 'REQ', payload: encrypted }); setStage('AWAITING_APPROVAL'); }
        });
        conn.on('data', (d: any) => handleData(d, conn)); conn.on('close', handleDisconnect); conn.on('error', () => { handleDisconnect(); });
    };

    const handleQRScan = (data: string) => {
        setShowScanner(false);
        try { const url = new URL(data); const connect = url.searchParams.get('connect'); const key = url.searchParams.get('key'); if (connect && key) { setTargetPeerId(connect); setAccessPin(key); joinSession(connect, key); return; }} catch(e) {}
        setTargetPeerId(data);
    };

    const handleAiAssist = async (currentText: string, setTextCallback: (t: string) => void) => {
        setIsAiThinking(true); playSound('AI_THINK');
        const context = messages.slice(-5).map(m => `${m.sender}: ${m.content}`).join('\n');
        const prompt = currentText ? `Draft reply for: "${currentText}". Context:\n${context}` : `Suggest reply. Context:\n${context}`;
        try { if (OMNI_KERNEL && OMNI_KERNEL.raceStream) { const stream = OMNI_KERNEL.raceStream(prompt, "Helpful chat assistant."); let full = ''; for await (const chunk of stream) { if (chunk.text) { full += chunk.text; setTextCallback(full); }}}} catch (e) {} finally { setIsAiThinking(false); }
    };

    const sendMessage = async (type: string, content: string, extras = {}) => {
        if (!connRef.current) return;
        let finalContent = content; let isTranslated = false;
        if (type === 'TEXT' && translateTarget && content.trim()) {
            setIsAiThinking(true); playSound('TRANSLATE');
            if (OMNI_KERNEL && OMNI_KERNEL.raceStream) {
                const stream = OMNI_KERNEL.raceStream(`Translate to ${translateTarget.name}: "${content}"`, "Translator.");
                let t = ''; for await (const c of stream) if(c.text) t+=c.text; finalContent = t.trim(); isTranslated = true;
            }
            setIsAiThinking(false);
        }
        const msgId = crypto.randomUUID(); const payloadObj = { id: msgId, type, content: finalContent, timestamp: Date.now(), ttl: ttlMode, isTranslated, originalLang: translateTarget?.name, ...extras };
        const encrypted = await encryptData(JSON.stringify(payloadObj), pinRef.current);
        if (!encrypted) return;
        if (encrypted.length > CHUNK_SIZE) { const total = Math.ceil(encrypted.length / CHUNK_SIZE); for(let i=0; i<total; i++) connRef.current.send({ type: 'CHUNK', id: crypto.randomUUID(), idx: i, total, chunk: encrypted.slice(i*CHUNK_SIZE, (i+1)*CHUNK_SIZE) }); } else connRef.current.send({ type: 'MSG', payload: encrypted });
        setMessages(p => [...p, { ...payloadObj, sender: 'ME', status: 'SENT' } as Message]); playSound('MSG_OUT');
    };

    // =========================================================================
    // RENDER: PWA & IOS OPTIMIZED STRUCTURE
    // =========================================================================
    
    return (
        // MAIN CONTAINER: Handles Viewport Height & Background
        <div className="h-[100dvh] w-full bg-[#050505] flex flex-col relative font-sans text-white overflow-hidden touch-none select-none">
            
            {/* --- LAYER 1: ABSOLUTE OVERLAYS (ALWAYS ON TOP) --- */}
            
            {/* 1. CONNECTION NOTIFICATION (Z-INDEX 100000 - SUPREME LAYER) */}
            {incomingRequest && (
                 <ConnectionNotification 
                     identity={incomingRequest.identity} 
                     peerId={incomingRequest.peerId} 
                     onAccept={async () => {
                         connRef.current = incomingRequest.conn;
                         const payload = JSON.stringify({ type: 'CONNECTION_ACCEPT', identity: myProfile.username });
                         const enc = await encryptData(payload, pinRef.current);
                         if(enc) incomingRequest.conn.send({type: 'RESP', payload: enc});
                         setStage('SECURE'); setMode('CHAT'); setIncomingRequest(null); startHeartbeat();
                     }} 
                     onDecline={()=>{ setIncomingRequest(null); }} 
                 />
            )}

            {/* 2. GLOBAL STATUS PILL */}
            <GlobalStatusOverlay stage={stage} isOnline={isPeerOnline} ping={pingLatency} />
            
            {/* 3. MODALS (Z-INDEX 50-100) */}
            {viewImage && <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 touch-manipulation" onClick={()=>setViewImage(null)}><img src={viewImage} className="max-w-full max-h-full rounded shadow-2xl"/></div>}
            {incomingCall && !showCall && <CallNotification identity={incomingCall.peer} onAnswer={()=>{setShowCall(true)}} onDecline={()=>{incomingCall.close(); setIncomingCall(null);}} />}
            {showCall && <TeleponanView onClose={()=>{setShowCall(false); setIncomingCall(null);}} existingPeer={peerRef.current} initialTargetId={targetPeerId} incomingCall={incomingCall} secretPin={pinRef.current}/>}

            {/* --- LAYER 2: APPLICATION SCREENS --- */}
            
            <div className="flex-1 flex flex-col h-full w-full relative z-0">
                {mode === 'SELECT' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 relative animate-in fade-in duration-500">
                        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                        <div className="text-center z-10 space-y-2 mb-10">
                            <h1 className="text-5xl font-black italic tracking-tighter drop-shadow-lg">IStoic <span className="text-emerald-500">NET</span></h1>
                            <p className="text-[10px] text-neutral-500 font-mono tracking-widest">PWA READY • IOS OPTIMIZED</p>
                        </div>
                        <div className="grid gap-4 w-full max-w-xs z-10">
                            <button onClick={()=>{setAccessPin(Math.floor(100000+Math.random()*900000).toString()); setMode('HOST');}} className="p-5 bg-[#09090b] border border-white/10 hover:border-emerald-500/50 rounded-2xl flex items-center gap-4 transition-all active:scale-95 touch-manipulation">
                                <Server className="text-emerald-500"/>
                                <div><h3 className="font-bold">HOST SECURE</h3><p className="text-[9px] text-neutral-500">Create Private Room</p></div>
                            </button>
                            <button onClick={()=>setMode('JOIN')} className="p-5 bg-[#09090b] border border-white/10 hover:border-blue-500/50 rounded-2xl flex items-center gap-4 transition-all active:scale-95 touch-manipulation">
                                <ScanLine className="text-blue-500"/>
                                <div><h3 className="font-bold">JOIN TARGET</h3><p className="text-[9px] text-neutral-500">Scan or Input ID</p></div>
                            </button>
                            <button onClick={()=>setShowSidebar(true)} className="p-4 text-neutral-500 hover:text-white text-xs font-bold tracking-widest flex items-center justify-center gap-2 touch-manipulation"><Menu size={14}/> CONTACTS</button>
                        </div>
                        <SidebarIStokContact isOpen={showSidebar} onClose={()=>setShowSidebar(false)} sessions={sessions} profile={myProfile} onSelect={(s)=>{ setTargetPeerId(s.id); setAccessPin(s.pin); joinSession(s.id, s.pin); setShowSidebar(false); }} onCallContact={()=>{}} onRenameSession={()=>{}} onDeleteSession={()=>{}} onRegenerateProfile={()=>{}} currentPeerId={null} />
                    </div>
                )}

                {(mode === 'HOST' || mode === 'JOIN') && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black relative">
                        {showScanner && <div className="absolute inset-0 z-40 bg-black animate-in fade-in"><QRScanner onScan={handleQRScan} onClose={()=>setShowScanner(false)} /></div>}
                        
                        <button onClick={()=>{setMode('SELECT'); setStage('IDLE');}} className="absolute top-6 left-6 z-30 text-neutral-500 hover:text-white flex items-center gap-2 text-xs font-bold pt-[env(safe-area-inset-top)]"><ArrowLeft size={16}/> ABORT</button>
                        
                        {mode === 'HOST' ? (
                            <div className="w-full max-w-sm bg-[#09090b] border border-white/10 p-8 rounded-[32px] text-center space-y-6">
                                <Server className="text-emerald-500 mx-auto animate-pulse" size={48} />
                                <div>
                                    <p className="text-[10px] text-neutral-500 font-mono mb-2">SIGNAL ID</p>
                                    <code className="block bg-black p-3 rounded-lg border border-white/10 text-emerald-500 text-xs font-mono break-all">{myProfile.id}</code>
                                </div>
                                <div>
                                    <p className="text-[10px] text-neutral-500 font-mono mb-2">ACCESS PIN</p>
                                    <div className="text-3xl font-black tracking-[0.5em]">{accessPin}</div>
                                </div>
                                <button onClick={()=>setShowShare(true)} className="w-full py-3 bg-white/5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 touch-manipulation"><QrCode size={14}/> SHOW QR</button>
                            </div>
                        ) : (
                            <div className="w-full max-w-sm space-y-4">
                                <div className="text-center mb-8">
                                    <div onClick={()=>setShowScanner(true)} className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-blue-500/20 border border-blue-500/30 touch-manipulation"><ScanLine className="text-blue-500" size={32}/></div>
                                    <h2 className="text-xl font-bold">ESTABLISH UPLINK</h2>
                                </div>
                                <input value={targetPeerId} onChange={e=>setTargetPeerId(e.target.value)} placeholder="TARGET ID" className="w-full bg-[#09090b] p-4 rounded-xl border border-white/10 text-center font-mono focus:border-blue-500 transition-colors"/>
                                <input value={accessPin} onChange={e=>setAccessPin(e.target.value)} placeholder="PIN" className="w-full bg-[#09090b] p-4 rounded-xl border border-white/10 text-center font-mono tracking-widest focus:border-blue-500 transition-colors"/>
                                <button onClick={()=>joinSession()} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-transform touch-manipulation">CONNECT NOW</button>
                            </div>
                        )}
                        {showShare && <ShareConnection peerId={myProfile.id} pin={accessPin} onClose={()=>setShowShare(false)}/>}
                    </div>
                )}

                {mode === 'CHAT' && (
                    <>
                        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-[#09090b] z-20 pt-[calc(env(safe-area-inset-top)+3rem)]">
                            <button onClick={()=>{connRef.current?.close(); setMode('SELECT'); setMessages([]);}} className="touch-manipulation"><ArrowLeft size={20}/></button>
                            <div className="flex gap-4">
                                <button onClick={()=>triggerHaptic(50)} className="touch-manipulation"><Zap size={18} className="text-yellow-500"/></button>
                                <button onClick={()=>setShowCall(true)} className="touch-manipulation"><PhoneCall size={18} className="text-emerald-500"/></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scroll bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-95 overscroll-contain">
                            {messages.map(m => ( <MessageBubble key={m.id} msg={m} setViewImage={setViewImage} onBurn={(id: string)=>setMessages(p=>p.filter(x=>x.id!==id))} /> ))}
                            <div ref={msgEndRef} />
                        </div>
                        <IStokInput 
                            onSend={(t:string)=>sendMessage('TEXT', t)} onTyping={()=>{}} disabled={!isPeerOnline}
                            isRecording={isRecording} recordingTime={recordingTime} isVoiceMasked={isVoiceMasked}
                            onToggleMask={()=>setIsVoiceMasked(!isVoiceMasked)} onAttach={()=>fileInputRef.current?.click()}
                            ttlMode={ttlMode} onToggleTtl={()=>setTtlMode(p => p===0 ? 10 : (p===10 ? 60 : 0))}
                            onStartRecord={async ()=>{ try { const stream = await navigator.mediaDevices.getUserMedia({audio:true}); const recorder = new MediaRecorder(stream); mediaRecorderRef.current = recorder; audioChunksRef.current = []; recorder.ondataavailable = e => audioChunksRef.current.push(e.data); recorder.start(); setIsRecording(true); setRecordingTime(0); } catch(e) {}}}
                            onStopRecord={()=>{ if(mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); mediaRecorderRef.current.onstop = () => { const blob = new Blob(audioChunksRef.current, {type:'audio/webm'}); const reader = new FileReader(); reader.onloadend = () => { sendMessage('AUDIO', (reader.result as string).split(',')[1], {duration:recordingTime, isMasked:isVoiceMasked}); }; reader.readAsDataURL(blob); setIsRecording(false); };}}}
                            onAiAssist={handleAiAssist} isAiThinking={isAiThinking} translateTarget={translateTarget} setTranslateTarget={setTranslateTarget}
                        />
                    </>
                )}
            </div>

            <input type="file" ref={fileInputRef} className="hidden" onChange={(e)=>{ const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onload = async (ev) => { if(f.type.startsWith('image/')) { const cmp = await compressImage(f); sendMessage('IMAGE', cmp.base64.split(',')[1], {size:cmp.size}); } else { sendMessage('FILE', (ev.target?.result as string).split(',')[1], {fileName:f.name, size:f.size, mimeType:f.type}); }}; r.readAsDataURL(f); }}}/>
        </div>
    );
};
