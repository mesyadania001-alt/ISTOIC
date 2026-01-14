import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'full';
    children: React.ReactNode;
    footer?: React.ReactNode;
}

const getSizeClass = (size: DialogProps['size']) => {
    switch (size) {
        case 'sm': return 'max-w-md';
        case 'lg': return 'max-w-4xl';
        case 'full': return 'w-full h-full max-w-none';
        default: return 'max-w-2xl';
    }
};

export const Dialog: React.FC<DialogProps> = ({ open, onClose, title, size = 'md', children, footer }) => {
    const overlayRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Backspace' && (e.metaKey || e.ctrlKey)) onClose();
        };
        if (open) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKey);
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            window.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;

    const content = (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 py-10 md:py-16"
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Dialog'}
        >
            <div className={`relative w-full ${getSizeClass(size)} max-h-full overflow-hidden rounded-3xl border border-skin-border bg-skin-card shadow-[0_30px_120px_rgba(0,0,0,0.35)] flex flex-col`}>
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-skin-border bg-skin-surface">
                    <div>
                        <p className="overline text-skin-muted">{title || 'Dialog'}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-skin-muted hover:text-skin-text hover:bg-skin-surface-hover transition-all"
                        aria-label="Close dialog"
                        type="button"
                    >
                        ×
                    </button>
                </div>
                <div className="flex-1 overflow-auto px-6 py-5 custom-scroll bg-skin-card">
                    {children}
                </div>
                {footer && (
                    <div className="border-t border-skin-border bg-skin-surface px-6 py-4 flex items-center justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(content, document.body);
};
