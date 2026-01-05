import React from 'react';
import { Users, Crown, Wifi, WifiOff, Phone, Loader2 } from 'lucide-react';

interface Participant {
    id: string;
    name: string;
    status: 'ONLINE' | 'OFFLINE' | 'VERIFYING' | 'RECONNECTING';
    isHost: boolean;
}

interface ParticipantListProps {
    participants: Participant[];
    isOpen: boolean;
    onClose: () => void;
    onCall: (id: string) => void;
    myId: string;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({ participants, isOpen, onClose, onCall, myId }) => {
    const getStatusColor = (status: string) => {
        switch(status) {
            case 'ONLINE': return 'bg-emerald-500 shadow-[0_0_5px_#10b981]';
            case 'VERIFYING': return 'bg-amber-500 animate-pulse';
            case 'RECONNECTING': return 'bg-orange-500 animate-pulse';
            default: return 'bg-red-500';
        }
    };

    return (
        <div className={`
            fixed inset-y-0 right-0 w-72 bg-[#09090b]/95 backdrop-blur-xl border-l border-white/10 z-[2050]
            transform transition-transform duration-300 ease-out shadow-2xl flex flex-col
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2 text-white">
                    <Users size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">ANGGOTA ROOM ({participants.length})</span>
                </div>
                <button onClick={onClose} className="text-neutral-500 hover:text-white text-xs font-bold">TUTUP</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                {participants.map((p) => {
                    const isMe = p.id === myId;
                    return (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 group border border-transparent hover:border-white/5 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.isHost ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'}`}>
                                    {p.name.substring(0,2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                                        {p.name}
                                        {p.isHost && <Crown size={10} className="text-amber-500 fill-current" />}
                                        {isMe && <span className="text-[8px] text-neutral-500 bg-white/10 px-1 rounded">(YOU)</span>}
                                    </p>
                                    <p className="text-[9px] font-mono text-neutral-500 truncate flex items-center gap-1">
                                        {p.status === 'VERIFYING' && <Loader2 size={8} className="animate-spin" />}
                                        {p.id.slice(0,8)}...
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {!isMe && p.status === 'ONLINE' && (
                                    <button 
                                        onClick={() => onCall(p.id)}
                                        className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 scale-90 hover:scale-110"
                                        title="Call Direct"
                                    >
                                        <Phone size={12} fill="currentColor" />
                                    </button>
                                )}
                                <div className={`w-2 h-2 rounded-full ${getStatusColor(p.status)}`}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};