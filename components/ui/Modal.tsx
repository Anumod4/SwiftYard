
import React, { useEffect, useRef } from 'react';
import { ModalPortal } from './ModalPortal';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDirty?: boolean;
    title: string;
    maxWidth?: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    isDirty = false,
    title,
    maxWidth = 'max-w-lg',
    children
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    const handleClose = () => {
        if (isDirty) {
            if (window.confirm("Changes will not be saved, proceed?")) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                handleClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleOutsideClick);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, isDirty, onClose]); // Note: handleClose is derived from isDirty and onClose

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div
                    ref={modalRef}
                    className={`bg-surface w-full ${maxWidth} rounded-[2.5rem] border border-border p-8 shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar`}
                >
                    <button
                        type="button"
                        onClick={handleClose}
                        className="absolute top-8 right-8 text-muted hover:text-foreground transition-colors z-10"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-black mb-8 text-foreground tracking-tight pr-10">{title}</h2>
                    {children}
                </div>
            </div>
        </ModalPortal>
    );
};
