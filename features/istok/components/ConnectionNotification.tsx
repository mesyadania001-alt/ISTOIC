import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, X, Zap, ScanLine, Fingerprint, Radio, Lock, Globe, AlertTriangle } from 'lucide-react';

interface ConnectionNotificationProps {
    identity: string;
    peerId: string;
    sasCode?: string; // Short Authentication String (Safety Number)
    onAccept: () => void;
    onDecline: () => void;
}

export const ConnectionNotification: React.FC<ConnectionNotificationProps> = ({ identity, peerId, sasCode, onAccept, onDecline }) => {
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const progressRef = useRef<number>(0);
    const animationFrame = useRef<number>(0);

    // Initial Attention Grabber
    useEffect(() => {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    }, []);

    // Hold-to-Confirm Logic
    useEffect(() => {
        if (isHolding) {
            const startTime = Date.now();
            const DURATION = 1500; // 1.5s hold time

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const pct = Math.min((elapsed / DURATION) * 100, 100);
                setProgress(pct);
                
                if (pct < 100) {
                    animationFrame.current = requestAnimationFrame(animate);
                } else {
                    if (navigator.vibrate) navigator.vibrate(200);
                    onAccept();
                }
            };
            animationFrame.current = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(animationFrame.current);
            setProgress(0);
        }
        return () => cancelAnimationFrame(animationFrame.current);
    }, [isHolding, onAccept]);

    return (
        <div className="fixed inset-0 z-[11000] bg-black/90 backdrop-blur-xl flex items-center justify-center animate-fade-in font-sans pointer-events-auto p-6">
            
            <div className="w-full max-w-md bg-[#050505] border border-emerald-500/30 rounded-[40px] overflow-hidden shadow-[0_0_80px_rgba(16,185,129,0.15)] relative animate-slide-up ring-1 ring-emerald-500/20 group">
                
                {/* Holographic Scanlines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 via-emerald-300 to-emerald-600 animate-[shimmer_3s_infinite] shadow-[0_0_20px_#10b981]"></div>

                {/* Main Content */}
                <div className="p-8 flex flex-col items-center text-center relative z-10">
                    
                    {/* Security Badge */}
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-50"></div>
                        <div className="w-24 h-24 bg-[#0a0a0b] border-2 border-emerald-500/50 rounded-full flex items-center justify-center relative z-10 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                            <ShieldCheck size={40} className="text-emerald-400 animate-pulse" strokeWidth={1.5} />
                        </div>
                        <div className="absolute -bottom-4 bg-emerald-950 border border-emerald-500/50 px-4 py-1.5 rounded-full flex items-center gap-2 z-20 shadow-lg">
                            <Lock size={12} className="text-emerald-400" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">SECURE_LINK_REQ</span>
                        </div>
                    </div>

                    <div className="space-y-2 mb-6">
                        <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                            <Globe size={12} /> INCOMING_TRANSMISSION
                        </h3>
                        <h2 className="text-3xl font-black text-white leading-none tracking-tight">
                            {identity || 'UNKNOWN_PEER'}
                        </h2>
                        <div className="flex items-center justify-center gap-2 opacity-60">
                             <Fingerprint size={12} className="text-emerald-500"/>
                             <span className="text-[10px] font-mono text-emerald-500 tracking-wider">ID: {peerId.slice(0, 12)}...</span>
                        </div>
                    </div>

                    {/* SAS FINGERPRINT DISPLAY */}
                    {sasCode && (
                        <div className="w-full bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-4 mb-6 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">SAFETY_FINGERPRINT</span>
                                <AlertTriangle size={12} className="text-emerald-600" />
                            </div>
                            <div className="text-2xl font-black text-white tracking-[0.5em] font-mono text-center relative z-10">
                                {sasCode}
                            </div>
                            <p className="text-[9px] text-neutral-500 mt-2 font-medium">Verify this code matches the sender's screen.</p>
                            
                            {/* Scanning Bar */}
                            <div className="absolute top-0 bottom-0 w-1 bg-emerald-500/20 blur-sm animate-[scan_2s_linear_infinite]"></div>
                        </div>
                    )}

                    {/* Action Area */}
                    <div className="grid grid-cols-1 w-full gap-4">
                        {/* HOLD TO CONFIRM BUTTON */}
                        <button 
                            onMouseDown={() => setIsHolding(true)}
                            onMouseUp={() => setIsHolding(false)}
                            onMouseLeave={() => setIsHolding(false)}
                            onTouchStart={() => setIsHolding(true)}
                            onTouchEnd={() => setIsHolding(false)}
                            className="relative h-16 w-full bg-white rounded-2xl flex items-center justify-center overflow-hidden group/btn active:scale-95 transition-transform"
                        >
                            {/* Progress Fill */}
                            <div 
                                className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-75 ease-linear"
                                style={{ width: `${progress}%` }}
                            ></div>
                            
                            <div className="relative z-10 flex flex-col items-center mix-blend-difference">
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
                                    {progress > 0 ? 'VERIFYING...' : 'HOLD TO VERIFY'}
                                </span>
                                <div className="flex gap-1 mt-1">
                                    <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                                    <div className="w-1 h-1 bg-white rounded-full animate-bounce delay-75"></div>
                                    <div className="w-1 h-1 bg-white rounded-full animate-bounce delay-150"></div>
                                </div>
                            </div>
                        </button>
                        
                        <button 
                            onClick={onDecline}
                            className="h-12 w-full rounded-2xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <X size={14} /> REJECT CONNECTION
                        </button>
                    </div>

                </div>
            </div>
            
            <style>{`
                @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                @keyframes scan { 0% { left: 0%; opacity: 0; } 50% { opacity: 1; } 100% { left: 100%; opacity: 0; } }
            `}</style>
        </div>
    );
};