
import React, { useEffect } from 'react';
import { ShieldCheck, X, Check, Fingerprint, Globe, Lock, AlertTriangle } from 'lucide-react';

interface ConnectionNotificationProps {
    identity: string;
    peerId: string;
    sasCode?: string; // Short Authentication String (Safety Number)
    onAccept: () => void;
    onDecline: () => void;
}

export const ConnectionNotification: React.FC<ConnectionNotificationProps> = ({ identity, peerId, sasCode, onAccept, onDecline }) => {

    // Initial Attention Grabber (Vibration)
    useEffect(() => {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
    }, []);

    return (
        <div className="fixed inset-0 z-[12000] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in font-sans pointer-events-auto p-6 touch-none">
            
            {/* Background Animated Scanlines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-50"></div>
            
            <div className="w-full max-w-sm bg-[#0a0a0b] border border-emerald-500/30 rounded-[32px] overflow-hidden shadow-[0_0_80px_rgba(16,185,129,0.2)] relative animate-slide-up ring-1 ring-emerald-500/20 flex flex-col">
                
                {/* Header Strip */}
                <div className="h-1 w-full bg-gradient-to-r from-emerald-600 via-emerald-300 to-emerald-600 animate-[shimmer_2s_infinite]"></div>

                <div className="p-8 flex flex-col items-center text-center relative z-10">
                    
                    {/* Icon Identity */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-50"></div>
                        <div className="w-20 h-20 bg-[#0a0a0b] border-2 border-emerald-500/50 rounded-full flex items-center justify-center relative z-10 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                            <ShieldCheck size={32} className="text-emerald-400 animate-pulse" strokeWidth={1.5} />
                        </div>
                    </div>

                    <div className="space-y-2 mb-6 w-full">
                        <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                            <Globe size={12} /> INCOMING_REQ
                        </h3>
                        <h2 className="text-2xl font-black text-white leading-tight tracking-tight break-all">
                            {identity || 'UNKNOWN_PEER'}
                        </h2>
                        <div className="flex items-center justify-center gap-2 bg-white/5 py-1.5 rounded-full mx-auto w-fit px-4 border border-white/5">
                             <Fingerprint size={12} className="text-emerald-500"/>
                             <span className="text-[10px] font-mono text-emerald-500 tracking-wider">ID: {peerId.slice(0, 8)}...</span>
                        </div>
                    </div>

                    {/* SAS Security Code Display */}
                    {sasCode && (
                        <div className="w-full bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-4 mb-8 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1"><Lock size={10}/> SAFETY_CODE</span>
                            </div>
                            <div className="text-3xl font-black text-white tracking-[0.2em] font-mono text-center relative z-10 shadow-black drop-shadow-md">
                                {sasCode}
                            </div>
                            <p className="text-[9px] text-neutral-500 mt-2 font-medium">Pastikan kode ini sama di layar teman Anda.</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button 
                            onClick={onDecline}
                            className="h-14 w-full rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95"
                        >
                            <X size={16} /> TOLAK
                        </button>
                        
                        <button 
                            onClick={onAccept}
                            className="h-14 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 animate-pulse"
                        >
                            <Check size={16} strokeWidth={3} /> TERIMA
                        </button>
                    </div>

                </div>
            </div>
            
            <style>{`
                @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
            `}</style>
        </div>
    );
};
