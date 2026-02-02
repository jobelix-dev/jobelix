/**
 * Confirmation Dialog Component
 * A reusable modal for confirm/alert dialogs, replacing native window.confirm/alert
 * Fixes focus issues that occur with native Windows popups in Electron
 */

'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: (confirmed: boolean) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'confirm' | 'alert' | 'danger';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'confirm',
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus confirm button when dialog opens
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      setTimeout(() => confirmButtonRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose(false);
      } else if (e.key === 'Enter' && variant === 'alert') {
        onClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, variant]);

  if (!isOpen) return null;

  const isAlert = variant === 'alert';
  const isDanger = variant === 'danger';

  return (
    <div
      className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose(false);
        }
      }}
    >
      <div className="bg-background rounded-lg shadow-2xl max-w-md w-full border border-border animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            {isDanger ? (
              <AlertTriangle className="w-6 h-6 text-error" />
            ) : (
              <Info className="w-6 h-6 text-info" />
            )}
            <h2 className="text-xl font-bold text-default">{title}</h2>
          </div>
          <button
            onClick={() => onClose(false)}
            className="p-2 hover:bg-primary-subtle rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-default whitespace-pre-wrap">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-surface/50">
          {!isAlert && (
            <button
              onClick={() => onClose(false)}
              className="px-6 py-2 rounded-lg border border-border bg-surface hover:bg-surface-hover text-default font-medium transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            ref={confirmButtonRef}
            onClick={() => onClose(true)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isDanger
                ? 'bg-error hover:bg-error-hover text-white'
                : 'bg-primary hover:bg-primary-hover text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
