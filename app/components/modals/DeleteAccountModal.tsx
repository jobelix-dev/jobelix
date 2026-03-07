'use client';

import { AlertTriangle } from 'lucide-react';

interface Props {
  isDeleting: boolean;
  deletePassword: string;
  deleteError: string | null;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteAccountModal({
  isDeleting,
  deletePassword,
  deleteError,
  onPasswordChange,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] px-4"
      onClick={() => { if (!isDeleting) onCancel(); }}
    >
      <div
        className="bg-surface rounded-2xl shadow-xl p-6 max-w-sm w-full relative animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-error" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Delete Account?</h2>
          <p className="text-sm text-muted mb-4">
            This will permanently delete all your data including:
          </p>
          <ul className="text-sm text-muted text-left mb-4 space-y-1 pl-4">
            <li>&bull; Your profile and resume</li>
            <li>&bull; All application history</li>
            <li>&bull; Credits and payment history</li>
          </ul>
          <p className="text-xs text-error font-medium mb-6">
            This action cannot be undone.
          </p>

          <div className="text-left mb-4">
            <label htmlFor="delete-account-password" className="block text-xs text-muted mb-1">
              Password (required for email/password accounts)
            </label>
            <input
              id="delete-account-password"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => onPasswordChange(e.target.value)}
              disabled={isDeleting}
              className="w-full px-3 py-2 bg-background border border-border/30 rounded-lg text-sm text-default focus:outline-none focus:ring-2 focus:ring-error/40"
            />
          </div>

          {deleteError && (
            <p className="text-xs text-error mb-4 text-left">{deleteError}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-background hover:bg-primary-subtle/50 text-default text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-error hover:bg-error/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
