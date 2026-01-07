
import React, { useState, useRef } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import { 
    User, UserCheck, Database, Palette, Globe, Shield, 
    X, Check, LogOut, ChevronRight, Moon, Sun, Monitor,
    Save, RefreshCw, Cpu, Zap, Wifi, Activity, Layers, Download, Upload
} from 'lucide-react';
import { TRANSLATIONS, getLang } from '../../services/i18n';
import { IstokIdentityService } from '../istok/services/istokIdentity';
import { debugService } from '../../services/debugService';
import { getUserPersona } from '../../services/persona';
import { UI_REGISTRY, FN_REGISTRY } from '../../constants/registry';
import { useFeatures, type SystemFeature } from '../../contexts/FeatureContext';
import { db } from '../../services/storage';

interface SettingsViewProps {
    onNavigate: (feature: any) => void;
}

const SettingsSection: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-skin-muted px-2">
            {React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">{title}</h3>
        </div>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const FeatureToggle: React.FC<{ 
    label: string, 
    desc: string, 
    isEnabled: boolean, 
    onToggle: () => void 
}> = ({ label, desc, isEnabled, onToggle }) => (
    <button 
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all group text-left ${isEnabled ? 'bg-skin-surface border-accent/30' : 'bg-skin-card border-skin-border opacity-70 hover:opacity-100'}`}
    >
        <div>
            <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isEnabled ? 'text-accent' : 'text-skin-muted'}`}>{label}</span>
                {isEnabled && <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_5px_var(--accent-color)]"></div>}
            </div>
            <p className="text-[9px] text-skin-muted font-medium">{desc}</p>
        </div>
        <div className={`w-10 h-5 rounded-full relative transition-colors ${isEnabled ? 'bg-accent' : 'bg-skin-border'}`}>
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${isEnabled ? 'left-6' : 'left-1'}`}></div>
        </div>
    </button>
);

const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
    // --- STATE ---
    const [localPersona, setLocalPersona] = useLocalStorage('user_persona_config', getUserPersona());
    const [appTheme, setAppTheme] = useLocalStorage('app_theme', 'cyan');
    const [appLanguage, setAppLanguage] = useLocalStorage('app_language', 'id');
    const [colorScheme, setColorScheme] = useLocalStorage('app_color_scheme', 'system');
    
    const { features, toggleFeature } = useFeatures();
    const [identity] = useLocalStorage<any>('istok_user_identity', null);
    
    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [isEditingId, setIsEditingId] = useState(false);
    const [newCodenameInput, setNewCodenameInput] = useState('');
    const [idUpdateMsg, setIdUpdateMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Derived
    const currentLang = getLang();
    const t = TRANSLATIONS[currentLang].settings;

    const handleSavePersona = () => {
        setIsSaving(true);
        debugService.logAction(UI_REGISTRY.SETTINGS_BTN_SAVE, FN_REGISTRY.SAVE_CONFIG, 'PERSONA_UPDATE');
        setTimeout(() => setIsSaving(false), 800);
    };

    const handleChangeId = async () => {
        if (!newCodenameInput || newCodenameInput.length < 3) {
            setIdUpdateMsg("Minimum 3 characters.");
            return;
        }
        
        if (!identity?.uid) {
            setIdUpdateMsg("No User UID found. Please login.");
            return;
        }

        setIsSaving(true);
        try {
            const res = await IstokIdentityService.updateCodename(identity.uid, newCodenameInput); 
            setIdUpdateMsg(res.msg);
            if (res.success) {
                setTimeout(() => {
                    setIsEditingId(false);
                    setIdUpdateMsg('');
                    window.location.reload(); // Force reload to refresh identity across app
                }, 1500);
            }
        } catch (e: any) {
            setIdUpdateMsg(e.message || "Update Failed");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        if (confirm("FACTORY RESET: All local data will be wiped. Continue?")) {
            debugService.logAction(UI_REGISTRY.SETTINGS_BTN_RESET, FN_REGISTRY.RESET_SYSTEM, 'CONFIRMED');
            localStorage.clear();
            window.location.reload();
        }
    };

    const handleBackup = async () => {
        try {
            const notes = await db.getAll('NOTES');
            const chats = await db.getAll('CHATS');
            
            const backupData = {
                version: "1.0",
                timestamp: new Date().toISOString(),
                notes,
                chats,
                persona: localPersona,
                features
            };
            
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `istoic_backup_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            debugService.logAction(UI_REGISTRY.SETTINGS_BTN_BACKUP, FN_REGISTRY.BACKUP_DATA, 'SUCCESS');
        } catch (e) {
            console.error("Backup Failed", e);
            alert("Backup failed. Check console.");
        }
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (data.notes) await db.saveAll('NOTES', data.notes);
                if (data.chats) await db.saveAll('CHATS', data.chats);
                if (data.persona) setLocalPersona(data.persona);
                
                alert("Restore Successful. Reloading...");
                window.location.reload();
            } catch (err) {
                alert("Invalid Backup File");
            }
        };
        reader.readAsDataURL(file);
    };

    const FEATURE_LIST: { id: SystemFeature; label: string; desc: string }[] = [
        { id: 'OMNI_RACE', label: 'HYDRA OMNI-RACE', desc: 'Parallel API execution engine for speed.' },
        { id: 'LIVE_LINK', label: 'NEURAL UPLINK', desc: 'Real-time audio processing module.' },
        { id: 'VISUAL_ENGINE', label: 'VISUAL CORE', desc: 'Canvas-based audio visualization.' },
        { id: 'AUTO_DIAGNOSTICS', label: 'AUTO MECHANIC', desc: 'Background system health monitoring.' },
        { id: 'HIGH_PERF_UI', label: 'GLASS UI ENGINE', desc: 'High-fidelity blur & animations (High GPU).' },
    ];

    return (
        <div className="h-full flex flex-col p-4 md:p-8 lg:p-12 pb-32 overflow-hidden font-sans animate-fade-in text-skin-text">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-skin-border pb-6 shrink-0 gap-4">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase">
                        SYSTEM <span className="text-accent">CONFIG</span>
                    </h1>
                    <p className="text-[10px] tech-mono font-bold text-skin-muted uppercase tracking-[0.3em] mt-2">
                        {t.title}
                    </p>
                </div>
                <button 
                    onClick={handleSavePersona}
                    disabled={isSaving}
                    className="px-6 py-3 bg-skin-text text-skin-card hover:bg-accent hover:text-black rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} {isSaving ? t.saved : t.save}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll pr-2 space-y-2">
                
                {/* 1. IDENTITY MATRIX */}
                <SettingsSection title={t.identity_title || "USER PROFILE"} icon={<UserCheck size={18} />}>
                    <div className="p-6 bg-skin-card rounded-[24px] border border-skin-border space-y-6">
                        
                        {/* ISTOIC ID EDITOR */}
                        <div className="space-y-3 pb-6 border-b border-skin-border">
                            <label className="text-[9px] font-black text-skin-muted uppercase tracking-widest pl-1">ISTOIC ID (CODENAME)</label>
                            {!isEditingId ? (
                                <div className="flex justify-between items-center bg-skin-surface p-4 rounded-2xl border border-skin-border">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                            <Shield size={18} />
                                        </div>
                                        <div>
                                            <span className="block text-sm font-black text-emerald-500 tracking-wider">
                                                {identity?.istokId || 'GUEST_USER'}
                                            </span>
                                            <span className="text-[9px] text-skin-muted font-mono">{identity?.email || 'Local Session'}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsEditingId(true)} className="px-4 py-2 bg-skin-card rounded-xl text-[9px] font-bold border border-skin-border hover:border-emerald-500 hover:text-emerald-500 transition-all uppercase tracking-wider">
                                        CHANGE ID
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3 bg-skin-surface p-4 rounded-2xl border border-emerald-500/30">
                                    <div className="flex gap-2">
                                        <div className="flex-1 flex items-center bg-skin-card rounded-xl border border-skin-border px-3 focus-within:border-emerald-500 transition-colors">
                                            <span className="text-[10px] font-black text-emerald-600 mr-2 select-none">ISTOIC-</span>
                                            <input 
                                                value={newCodenameInput}
                                                onChange={e => setNewCodenameInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                                className="flex-1 bg-transparent py-3 text-sm font-bold outline-none uppercase text-skin-text placeholder:text-skin-muted"
                                                placeholder="NEW_CODENAME"
                                                maxLength={12}
                                                autoFocus
                                            />
                                        </div>
                                        <button onClick={handleChangeId} disabled={isSaving} className="px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-50">
                                            {isSaving ? '...' : 'SAVE'}
                                        </button>
                                        <button onClick={() => setIsEditingId(false)} className="px-3 bg-skin-card border border-skin-border rounded-xl text-skin-muted hover:text-skin-text transition-all">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    {idUpdateMsg && <p className={`text-[10px] font-bold uppercase tracking-wide ${idUpdateMsg.toLowerCase().includes('success') ? 'text-emerald-500' : 'text-red-500'}`}>{idUpdateMsg}</p>}
                                    <p className="text-[9px] text-skin-muted font-mono leading-relaxed">
                                        Notice: ID changes are limited to prevent abuse. Your new ID will be unique across the IStok Network.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Existing Profile Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-skin-muted uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <User size={12}/> {t.user_name || "DISPLAY NAME"}
                                </label>
                                <input 
                                    type="text" 
                                    value={localPersona.nama} 
                                    onChange={(e) => setLocalPersona({...localPersona, nama: e.target.value})} 
                                    className="w-full bg-skin-surface border border-skin-border rounded-2xl px-5 py-4 text-sm font-bold text-skin-text focus:outline-none focus:border-accent/50 focus:bg-skin-card transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-skin-muted uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <Database size={12}/> {t.user_bio || "CONTEXT"}
                                </label>
                                <input 
                                    type="text" 
                                    value={localPersona.bio} 
                                    onChange={(e) => setLocalPersona({...localPersona, bio: e.target.value})} 
                                    className="w-full bg-skin-surface border border-skin-border rounded-2xl px-5 py-4 text-sm font-bold text-skin-text focus:outline-none focus:border-accent/50 focus:bg-skin-card transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </SettingsSection>

                {/* 2. SYSTEM MODULES (Restored) */}
                <SettingsSection title="SYSTEM MODULES" icon={<Cpu size={18} />}>
                    <div className="p-6 bg-skin-card rounded-[24px] border border-skin-border grid grid-cols-1 md:grid-cols-2 gap-4">
                         {FEATURE_LIST.map((feat) => (
                             <FeatureToggle 
                                key={feat.id}
                                label={feat.label}
                                desc={feat.desc}
                                isEnabled={features[feat.id]}
                                onToggle={() => toggleFeature(feat.id)}
                             />
                         ))}
                    </div>
                </SettingsSection>

                {/* 3. VISUAL & LANGUAGE */}
                <SettingsSection title={t.theme_label || "APPEARANCE"} icon={<Palette size={18} />}>
                    <div className="p-6 bg-skin-card rounded-[24px] border border-skin-border grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Theme Toggle */}
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-skin-muted uppercase tracking-widest pl-1">COLOR SCHEME</label>
                            <div className="flex bg-skin-surface p-1 rounded-xl border border-skin-border">
                                {['light', 'system', 'dark'].map((mode) => (
                                    <button 
                                        key={mode}
                                        onClick={() => setColorScheme(mode as any)}
                                        className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${colorScheme === mode ? 'bg-skin-card text-accent shadow-sm border border-skin-border' : 'text-skin-muted hover:text-skin-text'}`}
                                    >
                                        {mode === 'light' && <Sun size={12} />}
                                        {mode === 'dark' && <Moon size={12} />}
                                        {mode === 'system' && <Monitor size={12} />}
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Language */}
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-skin-muted uppercase tracking-widest pl-1 flex items-center gap-2">
                                <Globe size={12} /> LANGUAGE
                            </label>
                            <div className="flex bg-skin-surface p-1 rounded-xl border border-skin-border">
                                {['id', 'en', 'bn'].map((lang) => (
                                    <button 
                                        key={lang}
                                        onClick={() => { setAppLanguage(lang); window.location.reload(); }}
                                        className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${appLanguage === lang ? 'bg-skin-card text-accent shadow-sm border border-skin-border' : 'text-skin-muted hover:text-skin-text'}`}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </SettingsSection>

                {/* 4. DANGER ZONE (Updated) */}
                <SettingsSection title={t.data_title || "SYSTEM DATA"} icon={<Database size={18} />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={handleBackup} className="p-4 bg-skin-card border border-skin-border hover:border-accent/50 rounded-2xl flex items-center gap-3 group transition-all">
                            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors"><Download size={18}/></div>
                            <div className="text-left">
                                <h4 className="text-[10px] font-black text-skin-text uppercase tracking-widest">{t.backup}</h4>
                                <p className="text-[9px] text-skin-muted">Export local vault to JSON.</p>
                            </div>
                        </button>

                        <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-skin-card border border-skin-border hover:border-emerald-500/50 rounded-2xl flex items-center gap-3 group transition-all">
                            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors"><Upload size={18}/></div>
                            <div className="text-left">
                                <h4 className="text-[10px] font-black text-skin-text uppercase tracking-widest">{t.restore}</h4>
                                <p className="text-[9px] text-skin-muted">Import JSON backup.</p>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="application/json" onChange={handleRestore} />
                        </button>

                        <button 
                            onClick={handleReset}
                            className="w-full p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 group transition-all md:col-span-2"
                        >
                            <div className="p-2.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 group-hover:scale-110 transition-transform">
                                <LogOut size={18} />
                            </div>
                            <div className="text-left">
                                <h4 className="text-xs font-black text-red-500 uppercase tracking-widest">FACTORY RESET</h4>
                                <p className="text-[9px] text-red-400/70 font-mono">WIPE ALL LOCAL DATA & CREDENTIALS</p>
                            </div>
                        </button>
                    </div>
                </SettingsSection>

            </div>
        </div>
    );
};

export default SettingsView;
