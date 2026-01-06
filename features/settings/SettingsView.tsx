
import React, { useState, useEffect } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import { 
    User, UserCheck, Database, Palette, Globe, Shield, 
    X, Check, LogOut, ChevronRight, Moon, Sun, Monitor,
    Save, RefreshCw, Smartphone
} from 'lucide-react';
import { TRANSLATIONS, getLang, getText } from '../../services/i18n';
import { IstokIdentityService } from '../istok/services/istokIdentity';
import { debugService } from '../../services/debugService';
import { getUserPersona } from '../../services/persona';
import { UI_REGISTRY, FN_REGISTRY } from '../../constants/registry';

interface SettingsViewProps {
    onNavigate: (feature: any) => void;
}

const SettingsSection: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-skin-muted px-2">
            {React.cloneElement(icon as React.ReactElement, { size: 16 })}
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">{title}</h3>
        </div>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
    // --- STATE ---
    const [localPersona, setLocalPersona] = useLocalStorage('user_persona_config', getUserPersona());
    const [appTheme, setAppTheme] = useLocalStorage('app_theme', 'cyan');
    const [appLanguage, setAppLanguage] = useLocalStorage('app_language', 'id');
    const [colorScheme, setColorScheme] = useLocalStorage('app_color_scheme', 'system');
    
    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [isEditingId, setIsEditingId] = useState(false);
    const [newCodenameInput, setNewCodenameInput] = useState('');
    const [idUpdateMsg, setIdUpdateMsg] = useState('');
    
    // Derived
    const currentLang = getLang();
    const t = TRANSLATIONS[currentLang].settings;
    const [identity] = useLocalStorage<any>('istok_user_identity', null);

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

                {/* 2. VISUAL & LANGUAGE */}
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

                {/* 3. DANGER ZONE */}
                <SettingsSection title={t.data_title || "SYSTEM DATA"} icon={<Database size={18} />}>
                    <div className="p-1">
                        <button 
                            onClick={handleReset}
                            className="w-full p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between group transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 group-hover:scale-110 transition-transform">
                                    <LogOut size={20} />
                                </div>
                                <div className="text-left">
                                    <h4 className="text-xs font-black text-red-500 uppercase tracking-widest">FACTORY RESET</h4>
                                    <p className="text-[9px] text-red-400/70 font-mono mt-1">WIPE ALL LOCAL DATA & CREDENTIALS</p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-red-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </button>
                    </div>
                </SettingsSection>

            </div>
        </div>
    );
};

export default SettingsView;
