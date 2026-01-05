
import React, { useEffect, useState } from 'react';
import { ShieldCheck, X, Zap, ScanLine, Fingerprint, Check, Radio, Lock, Globe } from 'lucide-react';

interface ConnectionNotificationProps {
    identity: string;
    peerId: string;
    onAccept: () => void;
    onDecline: () => void;
}

export const ConnectionNotification: React.FC<ConnectionNotificationProps> = ({ identity, peerId, onAccept, onDecline }) => {
    const [isAccepting, setIsAccepting] = useState(false);

    useEffect(() => {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        // Play notification sound logic is handled in parent, but visuals are here
    }, []);

    const handleAccept = () => {
        setIsAccepting(true);
        // Short delay for visual feedback "Verifying..."
        setTimeout(() => {
            onAccept();
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[11000] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center animate-fade-in font-sans pointer-events-auto p-4">
            
            <div className="w-full max-w-sm bg-[#09090b] border border-emerald-500/30 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.2)] relative animate-slide-up ring-1 ring-emerald-500/20">
                
                {/* Background FX */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 animate-[shimmer_2s_infinite]"></div>

                {/* Header Section */}
                <div className="p-8 pb-6 flex flex-col items-center text-center relative z-10">
                    
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                        <div className="w-20 h-20 bg-[#0a0a0b] border-2 border-emerald-500 rounded-full flex items-center justify-center relative z-10 shadow-lg shadow-emerald-500/20">
                            <Radio size={32} className="text-emerald-500 animate-pulse" />
                        </div>
                        <div className="absolute -bottom-3 bg-emerald-950 border border-emerald-500/50 px-3 py-1 rounded-full flex items-center gap-1.5 z-20">
                            <Lock size={10} className="text-emerald-400" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">E2EE_REQ</span>
                        </div>
                    </div>

                    <h3 className="text-sm font-black text-emerald-500 uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
                        <Globe size={12} /> INCOMING_UPLINK
                    </h3>
                    
                    <h2 className="text-3xl font-black text-white leading-none tracking-tight mb-2">
                        {identity || 'UNKNOWN_PEER'}
                    </h2>
                    
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                        <Fingerprint size={12} className="text-neutral-500" />
                        <code className="text-[10px] font-mono text-neutral-400 tracking-wider">
                            ID: {peerId.slice(0, 8)}...{peerId.slice(-4)}
                        </code>
                    </div>
                </div>

                {/* Action Section */}
                <div className="p-4 bg-zinc-900/50 border-t border-white/5 grid grid-cols-2 gap-4">
                    <button 
                        onClick={onDecline}
                        disabled={isAccepting}
                        className="h-16 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <X size={20} />
                        <span className="text-[9px] font-black uppercase tracking-widest">DECLINE</span>
                    </button>
                    
                    <button 
                        onClick={handleAccept}
                        disabled={isAccepting}
                        className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg ${
                            isAccepting 
                            ? 'bg-emerald-500 text-white cursor-wait' 
                            : 'bg-white hover:bg-zinc-200 text-black'
                        }`}
                    >
                        {isAccepting ? (
                            <>
                                <ScanLine size={20} className="animate-spin" />
                                <span className="text-[9px] font-black uppercase tracking-widest">VERIFYING...</span>
                            </>
                        ) : (
                            <>
                                <Check size={20} strokeWidth={3} />
                                <span className="text-[9px] font-black uppercase tracking-widest">CONNECT</span>
                            </>
                        )}
                    </button>
                </div>

                <div className="h-1.5 w-full bg-emerald-900/30">
                    <div className="h-full bg-emerald-500 animate-[loading_4s_ease-in-out_infinite] w-full origin-left transform scale-x-0"></div>
                </div>
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes loading {
                    0% { transform: scaleX(0); }
                    50% { transform: scaleX(1); }
                    100% { transform: scaleX(0); transform-origin: right; }
                }
            `}</style>
        </div>
    );
};
