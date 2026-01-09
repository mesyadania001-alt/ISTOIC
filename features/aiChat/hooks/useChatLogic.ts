
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { type ChatThread, type ChatMessage, type Note } from '../../../types';
import { MODEL_CATALOG } from '../../../services/melsaKernel';
import { useVault } from '../../../contexts/VaultContext';
import { debugService } from '../../../services/debugService';
import { PollinationsService } from '../../../services/pollinationsService';
import { MemoryService } from '../../../services/memoryService';
import { useChatStorage } from '../../../hooks/useChatStorage'; 
import { useAIStream } from './useAIStream';

/**
 * ENHANCED CHAT LOGIC HOOK v2.1 (STABLE)
 * Fixed: Double message rendering.
 * Optimized: 60FPS State Updates.
 */
export const useChatLogic = (notes: Note[], setNotes: (notes: Note[]) => void) => {
    // --- 1. CORE STORAGE & STATE ---
    const storage = useChatStorage();
    const { 
        threads, setThreads, activeThreadId, setActiveThreadId,
        createThread, addMessage, renameThread, isThreadsLoaded, updateMessage 
    } = storage;

    // --- 2. PREFERENCES ---
    const [globalModelId, setGlobalModelId] = useLocalStorage<string>('global_model_preference', 'llama-3.3-70b-versatile');
    const [imageModelId, setImageModelId] = useLocalStorage<string>('image_model_preference', 'hydra');
    const [isAutoSpeak, setIsAutoSpeak] = useLocalStorage<boolean>('is_auto_speak', false);
    
    // --- 3. CONTEXTS ---
    const { isVaultUnlocked, lockVault, unlockVault, isVaultConfigEnabled } = useVault();
    const [input, setInput] = useState('');
    const [isLiveModeActive, setIsLiveModeActive] = useState(false);

    // --- 4. REFS ---
    // Refs for safe async access
    const activeThreadIdRef = useRef<string | null>(activeThreadId);
    
    useEffect(() => { 
        activeThreadIdRef.current = activeThreadId; 
    }, [activeThreadId]);

    const notesRef = useRef(notes);
    useEffect(() => { notesRef.current = notes; }, [notes]);

    // --- 5. ACTIVE THREAD RESOLUTION ---
    const activeThread = useMemo(() => {
        return threads.find(t => t.id === activeThreadId) || null;
    }, [threads, activeThreadId]);

    const activeModel = useMemo(() => {
        const id = activeThread?.model_id || globalModelId;
        return MODEL_CATALOG.find(m => m.id === id) || MODEL_CATALOG[0];
    }, [activeThread, globalModelId]);

    const personaMode = activeThread?.persona || 'stoic';
    const vaultEnabled = isVaultConfigEnabled(personaMode);

    // --- 6. AI STREAM ENGINE ---
    const { isLoading, stopGeneration, streamMessage } = useAIStream({
        notes,
        setNotes,
        activeThread,
        storage,
        isVaultUnlocked,
        vaultEnabled,
        isAutoSpeak,
        imageModelId
    });

    // --- 7. MEMORY OPERATIONS ---
    const triggerMemoryConsolidation = useCallback(() => {
        if (activeThread) {
            MemoryService.summarizeAndStore(activeThread, notesRef.current, setNotes);
        }
    }, [activeThread, setNotes]);

    const deleteThreadWrapper = useCallback((id: string) => {
        if (activeThreadId === id) {
            triggerMemoryConsolidation();
            setActiveThreadId(null);
        } else {
            const target = threads.find(t => t.id === id);
            if (target) MemoryService.summarizeAndStore(target, notesRef.current, setNotes);
        }
        storage.deleteThread(id);
    }, [threads, activeThreadId, triggerMemoryConsolidation, setNotes, storage, setActiveThreadId]);

    const handleNewChat = useCallback(async (persona: 'hanisah' | 'stoic' = 'stoic') => {
        triggerMemoryConsolidation();

        const welcome = persona === 'hanisah' 
            ? "⚡ **HANISAH V20 ONLINE.**\n\n*Hai sayang, sistem udah di-upgrade nih. Mau ngomongin apa?*" 
            : "🧠 **STOIC V20 TITANIUM.**\n\n*Logic Core V20 Initialized.*\nSistem stabil. Mari bedah realitas.";
        
        // createThread handles state update internally
        const newThread = createThread(persona, globalModelId, welcome);
        
        setActiveThreadId(newThread.id);
        return newThread;
    }, [createThread, globalModelId, triggerMemoryConsolidation, setActiveThreadId]);

    // --- 8. SEND MESSAGE LOGIC (FIXED) ---
    const handleSendMessage = async (e?: React.FormEvent, attachment?: { data: string, mimeType: string }) => {
        if (e) e.preventDefault();
        
        const userMsgText = input.trim();
        if ((!userMsgText && !attachment) || isLoading) return;
        
        setInput(''); // Clear input immediately for responsiveness

        let currentThreadId = activeThreadId;
        const threadExists = threads.some(t => t.id === currentThreadId);
        const currentPersona = personaMode; 

        const userMsgId = uuidv4();
        const newUserMsg: ChatMessage = {
            id: userMsgId,
            role: 'user',
            text: attachment ? (userMsgText || "Analyze attachment") : userMsgText,
            metadata: { 
                status: 'success', 
                createdAt: new Date().toISOString(),
                hasAttachment: !!attachment 
            }
        };

        // --- SCENARIO 1: NEW CHAT ---
        if (!currentThreadId || !threadExists) {
             const newId = uuidv4();
             const welcomeMsg = personaMode === 'hanisah' 
                ? "⚡ **HANISAH V20 ONLINE.**\n\n*Hai sayang, sistem udah di-upgrade nih. Mau ngomongin apa?*" 
                : "🧠 **STOIC V20 TITANIUM.**\n\n*Logic Core V20 Initialized.*";

            const newThread: ChatThread = {
                id: newId,
                title: userMsgText.slice(0, 30).toUpperCase() || 'NEW_SESSION',
                persona: personaMode,
                model_id: globalModelId,
                messages: [
                    { id: uuidv4(), role: 'model', text: welcomeMsg, metadata: { status: 'success', model: 'System' } },
                    newUserMsg 
                ],
                updated: new Date().toISOString(),
                isPinned: false
            };

            // Directly Set State
            setThreads(prev => [newThread, ...prev]);
            setActiveThreadId(newId);
            currentThreadId = newId; // Update local ref for streaming
            
            try {
                await streamMessage(userMsgText, activeModel, newId, personaMode, attachment);
            } catch (err) {
                console.error("Stream failed on new chat:", err);
            }
            return;
        }

        // --- SCENARIO 2: EXISTING CHAT (FIXED) ---
        // CRITICAL FIX: Removed the redundant setThreads call here. 
        // addMessage() inside useChatStorage already updates the state AND handles persistence.
        // Calling setThreads manually here caused the double rendering bug.
        
        addMessage(currentThreadId, newUserMsg);
        
        // Auto rename for new conversations
        const threadRef = threads.find(t => t.id === currentThreadId);
        if (threadRef && threadRef.messages.length <= 2 && userMsgText) {
            renameThread(currentThreadId, userMsgText.slice(0, 30).toUpperCase());
        }
        
        try {
            await streamMessage(userMsgText, activeModel, currentThreadId, currentPersona, attachment);
        } catch (err) {
            console.error("Stream failed on existing chat:", err);
            const errorMsg: ChatMessage = {
                id: uuidv4(),
                role: 'model',
                text: "⚠️ **CONNECTION LOST.**\nMaaf, terjadi kesalahan saat mengirim pesan. Silakan coba lagi.",
                metadata: { status: 'error' }
            };
            addMessage(currentThreadId, errorMsg);
        }
    };

    // --- 9. HYDRA / POLLINATIONS HANDLER ---
    const generateWithHydra = async () => {
        if (!input.trim()) return; 
        const promptText = input.trim();
        setInput(''); 
        
        let targetId = activeThreadId;
        const threadExists = threads.some(t => t.id === targetId);

        if (!targetId || !threadExists) {
            const newThread = await handleNewChat(personaMode);
            targetId = newThread.id;
        }

        if (personaMode === 'stoic') {
            const deniedMsg: ChatMessage = { 
                id: uuidv4(), 
                role: 'model', 
                text: "> 🚫 **ACCESS DENIED**\n\nSilakan beralih ke **HANISAH** untuk fitur kreatif.", 
                metadata: { status: 'error', model: 'SYSTEM_GATEKEEPER' } 
            };
            addMessage(targetId!, { id: uuidv4(), role: 'user', text: `Generate: ${promptText}`, metadata: { status: 'success' } });
            setTimeout(() => addMessage(targetId!, deniedMsg), 500);
            return;
        }

        const modelMsgId = uuidv4();
        
        addMessage(targetId!, { id: uuidv4(), role: 'user', text: `🎨 Generate: ${promptText}`, metadata: { status: 'success' } });
        
        addMessage(targetId!, { 
            id: modelMsgId, 
            role: 'model', 
            text: "🔄 **HYDRA ENGINE ACTIVE**\n*Constructing visual matrix...*", 
            metadata: { status: 'loading' } 
        });

        try {
            const targetModel = (imageModelId === 'gemini-2.5-flash-image' || imageModelId === 'gemini-3-pro-image-preview') 
                ? 'hydra-smart-route' 
                : imageModelId;

            const result = await PollinationsService.generateHydraImage(promptText, targetModel);
            
            updateMessage(targetId!, modelMsgId, {
                text: `Here is your creation based on "${promptText}":\n\n![Generated Image](${result.url})\n\n_Engine: ${result.model.toUpperCase()}_`,
                metadata: { status: 'success' }
            });
        } catch (e: any) {
            updateMessage(targetId!, modelMsgId, {
                text: `⚠️ **GENERATION FAILED**: ${e.message}`,
                metadata: { status: 'error' }
            });
        }
    };

    return {
        threads, 
        setThreads, 
        activeThread, 
        activeThreadId, 
        setActiveThreadId,
        isThreadsLoaded,
        isVaultSynced: isVaultUnlocked, 
        setIsVaultSynced: (val: boolean) => val ? unlockVault() : lockVault(),
        isVaultConfigEnabled: vaultEnabled, 
        isAutoSpeak, 
        setIsAutoSpeak, 
        isLiveModeActive, 
        setIsLiveModeActive,
        isLoading, 
        input, 
        setInput, 
        activeModel, 
        setGlobalModelId, 
        imageModelId, 
        setImageModelId,
        personaMode,
        handleNewChat, 
        sendMessage: handleSendMessage, 
        stopGeneration,
        generateWithHydra, 
        generateWithPollinations: generateWithHydra, 
        renameThread,
        togglePinThread: storage.togglePinThread,
        deleteThread: deleteThreadWrapper
    };
};
