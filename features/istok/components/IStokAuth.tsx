import React, { useState, useEffect, useRef } from 'react';
import { 
    Server, ScanLine, RefreshCw, 
    Fingerprint, Activity, ArrowRight, ShieldCheck,
    QrCode, Clipboard, Camera, X, Check, Loader2, Lock, Upload,
    ShieldAlert, Radio
} from 'lucide-react';
// @ts-ignore
import jsQR from 'jsqr';

interface IStokAuthProps {
    identity: string;
    onRegenerateIdentity: () => void;
    onHost: () => void;
    onJoin: (targetId: string, pin: string) => void;
    errorMsg?: string;
    onErrorClear: () => void;
    isRelayActive: boolean;
    forcedMode?: 'DEFAULT' | 'JOIN';
    connectionStage?: string; 
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
    const scanRef = useRef<number | null>(null);

    // Glitch effect for Identity
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
                    setGlitchedIdentity(original.split("").map((letter, index) => {
                        if (index < iteration) return original[index];
                        return letters[Math.floor(Math.random() * 26)];
                    }).join(""));
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
        const params = new URLSearchParams(window.location.search);
        const connect = params.get('connect');
        const key = params.get('key');
        if (connect && key) {
             setTargetId(connect);
             setPin(key);
             setTimeout(() => onJoin(connect, key), 800);
        }
    }, [forcedMode]);

    const processRawInput = (text: string) => {
        if (!text) return;
        let foundId = text;
        let foundKey = '';
        try {
            if (text.includes('connect=') && text.includes('key=')) {
                const connectMatch = text.match(/connect=([^&]+)/);
                const keyMatch = text.match(/key=([^&]+)/);
                if (connectMatch) foundId = connectMatch[1];
                if (keyMatch) foundKey = keyMatch[1];
            } 
        } catch (e) {}
        setTargetId(foundId);
        if (foundKey) {
            setPin(foundKey);
            if (navigator.vibrate) navigator.vibrate(50);
            setTimeout(() => onJoin(foundId, foundKey), 500);
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            processRawInput(text);
        } catch (err) {
            const input = document.getElementById('target-id-input') as HTMLInputElement;
            input?.focus();
        }
    };

    const startScanner = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
            streamRef.current = stream;
            setIsScanning(true);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute("playsinline", "true");
                    videoRef.current.play().then(() => requestAnimationFrame(scanLoop)).catch(console.error);
                }
            }, 100);
        } catch (err) {
            alert("Camera Access Denied");
        }
    };

    const scanLoop = () => {
        if (!videoRef.current || !streamRef.current) return;
        const video = videoRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            if ('BarcodeDetector' in window) {
                const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                detector.detect(video).then((barcodes: any[]) => {
                    if (barcodes.length > 0) {
                        processRawInput(barcodes[0].rawValue);
                        stopScanner();
                        return;
                    }
                }).catch(() => {});
            }
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
                if (code && code.data) {
                    processRawInput(code.data);
                    stopScanner();
                    return; 
                }
            }
        }
        scanRef.current = requestAnimationFrame(scanLoop);
    };

    const stopScanner = () => {
        if (scanRef.current) cancelAnimationFrame(scanRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setIsScanning(false);
    };

    useEffect(() => { return () => stopScanner(); }, []);

    if (isScanning) {
        return (
            <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
                <div className="flex-1 relative overflow-hidden">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    <div className="absolute inset-0 bg-black/40"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-72 h-72 border-2 border-emerald-500/50 rounded-3xl relative">
                            {/* Scanning Line */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400 shadow-[0_0_20px_#10b981] animate-[scan_2s_linear_infinite]"></div>
                            {/* Corner Markers */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl"></div>
                            <div className="absolute top-[-40px] left-0 right-0 text-center text-emerald-400 font-mono text-xs animate-pulse">SEARCHING QR CODE...</div>
                        </div>
                    </div>
                </div>
                <div className="p-8 bg-black flex justify-center pb-safe">
                    <button onClick={stopScanner} className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20 active:scale-95 transition-all">
                        <X size={24} />
                    </button>
                </div>
                <style>{`@keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }`}</style>
            </div>
        );
    }

    if (forcedMode === 'JOIN') {
        return (
            <div className="w-full max-w-md mx-auto p-6 animate-slide-up flex flex-col gap-6 relative">
                
                {/* Connecting Overlay */}
                {isConnecting && (
                    <div className="absolute inset-0 z-50 bg-[#09090b]/95 backdrop-blur-md rounded-[32px] flex flex-col items-center justify-center text-center p-6 animate-fade-in border border-emerald-500/20">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                            <div className="w-24 h-24 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin relative z-10 flex items-center justify-center bg-[#09090b]">
                                <Activity size={32} className="text-emerald-500" />
                            </div>
                        </div>
                        <h3 className="text-lg font-black text-white uppercase tracking-widest mb-1 animate-pulse">
                            {connectionStage.replace('_', ' ')}
                        </h3>
                        <p className="text-xs font-mono text-emerald-600/70">ESTABLISHING SECURE TUNNEL...</p>
                    </div>
                )}

                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20 shadow-[0_0_30px_rgba(37,99,235,0.1)]">
                        <ScanLine size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">SECURE JOIN</h2>
                    <p className="text-neutral-400 text-xs font-medium font-mono">ENCRYPTED P2P HANDSHAKE PROTOCOL</p>
                </div>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Radio size={10}/> TARGET IDENTIFIER</label>
                        <div className="relative flex items-center group">
                            <input 
                                id="target-id-input"
                                value={targetId}
                                onChange={(e) => processRawInput(e.target.value)}
                                placeholder="Paste ID or Link..." 
                                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-neutral-700 pr-12 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                                autoFocus
                            />
                            <button 
                                onClick={handlePaste}
                                className="absolute right-3 p-2 text-neutral-500 hover:text-white bg-white/5 rounded-xl hover:bg-white/10 transition-all active:scale-90"
                                title="Smart Paste"
                            >
                                <Clipboard size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Lock size={10}/> SECURITY PIN</label>
                        <div className="relative">
                            <input 
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="******" 
                                className="w-full bg-[#121214] border border-white/10 rounded-2xl px-5 py-4 text-sm font-mono text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-neutral-700 text-center tracking-[0.5em] focus:shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-3 pt-2">
                        <button 
                            onClick={startScanner} 
                            className="col-span-1 h-14 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl flex items-center justify-center text-white transition-all active:scale-95"
                            title="Scan QR"
                        >
                            <Camera size={20} />
                        </button>
                        <button 
                            onClick={() => onJoin(targetId, pin)}
                            disabled={!targetId || pin.length < 4}
                            className="col-span-4 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                            INITIATE_UPLINK <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl flex items-start gap-3 animate-slide-up backdrop-blur-sm">
                        <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1">CONNECTION_ABORTED</p>
                            <p className="text-xs opacity-90">{errorMsg}</p>
                        </div>
                        <button onClick={onErrorClear}><X size={14} /></button>
                    </div>
                )}
            </div>
        );
    }
    return null;
};