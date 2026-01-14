import React, { useRef, useEffect, useState, memo, useCallback, useMemo } from 'react';
import {
  Plus,
  Mic,
  MicOff,
  Paperclip,
  X,
  Palette,
  Smile,
  Database,
  DatabaseZap,
  Square,
  CornerDownLeft
} from 'lucide-react';
import { TRANSLATIONS, getLang } from '../../../services/i18n';
import { debugService } from '../../../services/debugService';
import { UI_REGISTRY, FN_REGISTRY } from '../../../constants/registry';
import { optimizeImageForAI } from '../../../utils/imageOptimizer';

interface ChatInputProps {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  onSubmit: (e?: React.FormEvent, options?: { attachment?: { data: string; mimeType: string } }) => void;
  onStop?: () => void;
  onNewChat: () => void;
  onFocusChange: (isFocused: boolean) => void;
  aiName: string;
  isVaultSynced?: boolean;
  onToggleVaultSync?: () => void;
  personaMode?: 'hanisah' | 'stoic';
  isVaultEnabled?: boolean;
  onTogglePersona?: () => void;
  variant?: 'hero' | 'standard';
  onPollinations?: () => void;
  disableVisuals?: boolean;
}

const MAX_CHARS = 4000;

const EMOJI_CATEGORIES = {
  EXPRESSIONS: ['😀', '😊', '😉', '😂', '😍', '🤔', '😴', '😎', '😭', '🙌'],
  SIGNALS: ['👍', '👎', '🙏', '🔥', '🎯', '⚡', '✅', '❓', '🚀', '💡'],
  NATURE: ['🌿', '🌱', '🌤️', '🌙', '⭐', '🌊', '🔥', '🍃', '🌻', '🌵']
};

export const ChatInput: React.FC<ChatInputProps> = memo(
  ({
    input,
    setInput,
    isLoading,
    onSubmit,
    onStop,
    onNewChat,
    onFocusChange,
    aiName,
    isVaultSynced = true,
    onToggleVaultSync,
    personaMode = 'hanisah',
    isVaultEnabled = true,
    onTogglePersona,
    variant = 'standard',
    onPollinations,
    disableVisuals = false
  }) => {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    const [isDictating, setIsDictating] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [attachment, setAttachment] = useState<{ file?: File; preview: string; base64: string; mimeType: string } | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [pasteFlash, setPasteFlash] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [activeEmojiCategory, setActiveEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>('EXPRESSIONS');

    const currentLang = getLang();
    const t = TRANSLATIONS[currentLang].chat;

    const suggestionChips = useMemo(() => {
      if (personaMode === 'hanisah') {
        return [
          { label: 'Buat Gambar', text: 'Buatkan gambar dengan detail: ' },
          { label: 'Ringkas', text: 'Tolong ringkas ini: ' },
          { label: 'Rencanakan Task', text: 'Buat daftar tugas dari: ' },
          { label: 'Brainstorm', text: 'Bantu ide untuk ' }
        ];
      }
      return [
        { label: 'Analisis', text: 'Analyze this logically: ' },
        { label: 'Debug', text: 'Debug this code: ' },
        { label: 'Ekstrak Task', text: 'Extract action items: ' },
        { label: 'Ringkas', text: 'Summarize key points: ' }
      ];
    }, [personaMode]);

    useEffect(() => {
      if (inputRef.current) {
        const textarea = inputRef.current;
        requestAnimationFrame(() => {
          textarea.style.height = 'auto';
          const newHeight = Math.min(textarea.scrollHeight, 150);
          textarea.style.height = `${Math.max(24, newHeight)}px`;
        });
      }
    }, [input, attachment]);

    useEffect(() => {
      return () => {
        if (recognitionRef.current) recognitionRef.current.stop();
      };
    }, []);

    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      if (inputRef.current) {
        const start = inputRef.current.selectionStart;
        const end = inputRef.current.selectionEnd;
        const next = input.substring(0, start) + text + input.substring(end);
        setInput(next);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.selectionStart = inputRef.current.selectionEnd = start + text.length;
          }
        }, 0);
      } else {
        setInput((prev) => prev + text);
      }
      setPasteFlash(true);
      setTimeout(() => setPasteFlash(false), 500);
    };

    const handleInsertEmoji = (emoji: string) => {
      if (inputRef.current) {
        const start = inputRef.current.selectionStart;
        const end = inputRef.current.selectionEnd;
        const next = input.substring(0, start) + emoji + input.substring(end);
        setInput(next);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.selectionStart = inputRef.current.selectionEnd = start + emoji.length;
            inputRef.current.focus();
          }
        }, 0);
      } else {
        setInput((prev) => prev + emoji);
      }
    };

    const toggleDictation = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        debugService.logAction(UI_REGISTRY.CHAT_INPUT_MIC, FN_REGISTRY.CHAT_SEND_MESSAGE, isDictating ? 'STOP' : 'START');

        if (isDictating) {
          recognitionRef.current?.stop();
          setIsDictating(false);
          return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          alert('Browser tidak mendukung voice input.');
          return;
        }

        try {
          const recognition = new SpeechRecognition();
          recognition.lang = TRANSLATIONS[currentLang].meta.code;
          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onstart = () => setIsDictating(true);
          recognition.onend = () => setIsDictating(false);
          recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              }
            }
            if (finalTranscript) {
              setInput((prev) => {
                const needsSpace = prev.length > 0 && !prev.endsWith(' ');
                return prev + (needsSpace ? ' ' : '') + finalTranscript;
              });
            }
          };
          recognition.onerror = () => setIsDictating(false);
          recognitionRef.current = recognition;
          recognition.start();
        } catch (err) {
          console.error('Mic initialization failed', err);
          alert('Gagal memulai mikrofon. Pastikan izin telah diberikan.');
        }
      },
      [currentLang, isDictating, setInput]
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isLoading) handleSubmit();
      }
    };

    const processFile = async (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Only images supported.');
        return;
      }
      try {
        const { base64, mimeType } = await optimizeImageForAI(file);
        setAttachment({
          file,
          preview: `data:${mimeType};base64,${base64}`,
          base64,
          mimeType
        });
      } catch (e) {
        console.error('Image processing error', e);
        alert('Failed to process image. Please try another file.');
      }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) processFile(e.target.files[0]);
      e.target.value = '';
    };

    const handleAttachClick = () => {
      if (disableVisuals) return;
      debugService.logAction(UI_REGISTRY.CHAT_INPUT_ATTACH, FN_REGISTRY.CHAT_SEND_MESSAGE, 'OPEN_DIALOG');
      fileInputRef.current?.click();
    };

    const handleStop = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onStop?.();
    };

    const handleSubmit = () => {
      if (isDictating) {
        recognitionRef.current?.stop();
        setIsDictating(false);
      }
      if ((!input.trim() && !attachment) || isLoading) return;
      if (input.length > MAX_CHARS) {
        alert(`Character limit exceeded (${MAX_CHARS}). Please shorten your message.`);
        return;
      }

      debugService.logAction(UI_REGISTRY.CHAT_INPUT_SEND, FN_REGISTRY.CHAT_SEND_MESSAGE, 'SUBMIT');

      const attachmentPayload = attachment ? { data: attachment.base64, mimeType: attachment.mimeType } : undefined;
      onSubmit(undefined, attachmentPayload ? { attachment: attachmentPayload } : undefined);
      setAttachment(null);
      if (inputRef.current) inputRef.current.style.height = 'auto';
      inputRef.current?.focus();
    };

    const charTone =
      input.length > MAX_CHARS * 0.9 ? 'var(--danger)' : input.length > MAX_CHARS * 0.7 ? 'var(--warning)' : 'var(--text-muted)';

    return (
      <div className="w-full relative group" style={{ willChange: 'transform' }}>
        {showEmojiPicker && <div className="fixed inset-0 z-20" onClick={() => setShowEmojiPicker(false)}></div>}

        {showEmojiPicker && (
          <div className="absolute bottom-[110%] left-0 w-full sm:w-80 bg-[var(--surface)] border border-[color:var(--border)] rounded-[20px] shadow-lg z-30 animate-slide-up flex flex-col overflow-hidden">
            <div className="flex p-1 border-b border-[color:var(--border)] overflow-x-auto no-scrollbar">
              {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveEmojiCategory(cat as any)}
                  className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-widest rounded-xl transition-all ${
                    activeEmojiCategory === cat
                      ? 'bg-[var(--surface-2)] text-[var(--text)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="p-3 grid grid-cols-5 gap-1 max-h-48 overflow-y-auto custom-scroll">
              {EMOJI_CATEGORIES[activeEmojiCategory].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleInsertEmoji(emoji)}
                  className="h-10 rounded-lg hover:bg-[var(--surface-2)] text-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {pasteFlash && (
          <div className="absolute -top-10 right-0 text-[10px] font-semibold text-[var(--success)] bg-[color:var(--success)]/10 border border-[color:var(--success)]/30 px-3 py-1 rounded-lg animate-fade-in flex items-center gap-2 backdrop-blur-sm">
            Format cleaned
          </div>
        )}

        <div
          className={`w-full transition-all duration-300 bg-[var(--surface)]/95 border border-[color:var(--border)] rounded-[28px] p-2 flex flex-col shadow-[0_16px_40px_rgba(0,0,0,0.12)] ${
            isDictating
              ? 'ring-2 ring-[color:var(--accent)] border-[color:var(--accent)]'
              : isFocused || isDragOver
                ? 'ring-2 ring-[color:var(--accent)]'
                : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
          }}
        >
          {attachment && (
            <div className="px-4 pt-4 pb-2 flex animate-slide-up">
              <div className="relative inline-block">
                <img
                  src={attachment.preview}
                  alt="Preview"
                  className="h-20 w-auto rounded-2xl border border-[color:var(--border)] shadow-md object-cover"
                />
                <button
                  onClick={() => setAttachment(null)}
                  aria-label="Remove Attachment"
                  className="absolute -top-2 -right-2 bg-[var(--bg)] text-[var(--text)] rounded-full p-1.5 shadow-md hover:bg-[var(--surface-2)] transition-colors border border-[color:var(--border)]"
                >
                  <X size={12} />
                </button>
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-[var(--bg)] text-[10px] text-[var(--text-muted)] font-mono uppercase border border-[color:var(--border)]">
                  {attachment.mimeType.split('/')[1]}
                </div>
              </div>
            </div>
          )}

          <div className="relative px-4 pt-3 pb-2 flex flex-col">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={() => {
                setIsFocused(true);
                onFocusChange(true);
              }}
              onBlur={() => {
                setIsFocused(false);
                onFocusChange(false);
              }}
              placeholder={isDictating ? '' : personaMode === 'hanisah' ? 'Tanya Hanisah...' : 'Kirim perintah Stoic...'}
              className="w-full bg-transparent text-base leading-relaxed font-medium text-[var(--text)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none max-h-60 custom-scroll"
              rows={1}
              aria-label="Chat input"
              disabled={isLoading && !onStop}
            />

            {!input && !attachment && !isDictating && (
              <div
                className={`flex gap-2 mt-2 ${
                  variant === 'hero' ? 'flex-wrap opacity-0 animate-fade-in' : 'overflow-x-auto no-scrollbar mask-fade-sides'
                }`}
                style={variant === 'hero' ? { animationDelay: '200ms', opacity: 1 } : {}}
              >
                {suggestionChips.map((chip, i) => (
                  <button
                    key={chip.label}
                    onClick={() => {
                      setInput(chip.text);
                      inputRef.current?.focus();
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-xl border text-[11px] font-medium whitespace-nowrap bg-[var(--surface-2)]/60 border-[color:var(--border)] hover:border-[color:var(--accent)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-all"
                    style={{ animationDelay: `${50 * i}ms` }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-3 pb-1.5 gap-2 border-t border-transparent mt-1">
            <div className="flex gap-2 items-center">
              <button
                onClick={onNewChat}
                aria-label="New chat"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text)] hover:border-[color:var(--accent)] border border-transparent transition-all active:scale-95"
                title={t.newChat}
              >
                <Plus size={18} />
              </button>

              <button
                onClick={handleAttachClick}
                disabled={disableVisuals}
                aria-label="Attach image"
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 border ${
                  disableVisuals
                    ? 'opacity-40 cursor-not-allowed text-[var(--text-muted)]'
                    : attachment
                      ? 'text-[var(--accent)] bg-[var(--accent)]/10 border-[color:var(--accent)]/30'
                      : 'bg-[var(--surface-2)] border-transparent text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[color:var(--accent)]/40'
                }`}
                title={disableVisuals ? 'Visuals disabled' : 'Attach image'}
              >
                <Paperclip size={18} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*" />

              <button
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 border ${
                  showEmojiPicker
                    ? 'text-[var(--accent)] bg-[var(--accent)]/10 border-[color:var(--accent)]/30'
                    : 'bg-[var(--surface-2)] border-transparent text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[color:var(--accent)]/30'
                }`}
                title="Insert emoji"
              >
                <Smile size={18} />
              </button>

              <button
                onClick={() => !disableVisuals && onPollinations?.()}
                disabled={disableVisuals}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 border ${
                  disableVisuals
                    ? 'opacity-40 cursor-not-allowed text-[var(--text-muted)]'
                    : 'bg-[var(--surface-2)] border-transparent text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[color:var(--accent)]/30'
                }`}
                title={disableVisuals ? 'Visuals disabled' : 'Generate visual'}
              >
                <Palette size={18} />
              </button>

              <button
                onClick={onToggleVaultSync}
                disabled={!isVaultEnabled}
                aria-label={isVaultEnabled ? (isVaultSynced ? 'Vault sync active' : 'Vault sync inactive') : 'Vault disabled'}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 border ${
                  !isVaultEnabled
                    ? 'opacity-40'
                    : isVaultSynced
                      ? 'text-[var(--success)] bg-[var(--success)]/10 border-[color:var(--success)]/30'
                      : 'bg-[var(--surface-2)] border-transparent text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[color:var(--accent)]/30'
                }`}
                title={isVaultEnabled ? 'Vault Sync' : 'Vault Disabled'}
              >
                {isVaultSynced ? <DatabaseZap size={18} /> : <Database size={18} />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className={`text-[11px] font-semibold transition-opacity ${input.length > 0 ? 'opacity-100' : 'opacity-0'}`} style={{ color: charTone }}>
                {input.length} <span className="opacity-60">/ {MAX_CHARS}</span>
              </div>

              <button
                onClick={toggleDictation}
                aria-label={isDictating ? 'Stop dictation' : 'Start dictation'}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 border ${
                  isDictating
                    ? 'bg-[var(--accent)] text-[var(--on-accent-color)] border-transparent shadow-lg'
                    : 'bg-[var(--surface-2)] border-transparent text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[color:var(--accent)]/30'
                }`}
                title="Voice input"
              >
                {isDictating ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {isLoading ? (
                <button
                  onClick={handleStop}
                  aria-label="Stop generation"
                  className="w-14 h-14 rounded-[18px] flex items-center justify-center transition-all duration-300 bg-[var(--danger)] text-[var(--on-accent-color)] shadow-lg hover:scale-105 active:scale-95"
                  title="Stop generation"
                >
                  <Square size={20} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={(!input.trim() && !attachment) || input.length > MAX_CHARS}
                  aria-label="Send message"
                  className={`w-14 h-14 rounded-[18px] flex items-center justify-center transition-all duration-300 border ${
                    input.trim() || attachment
                      ? 'bg-[var(--accent)] text-[var(--on-accent-color)] border-transparent shadow-lg hover:scale-105 active:scale-95'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)] cursor-not-allowed border-transparent'
                  }`}
                >
                  <CornerDownLeft size={24} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        </div>

        <style>{`
          .mask-fade-sides {
            mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
            -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          }
        `}</style>
      </div>
    );
  }
);

