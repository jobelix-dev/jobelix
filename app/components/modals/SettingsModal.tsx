'use client';

import { X, Settings, Info } from 'lucide-react';
import { UserProfile } from '@/lib/shared/types/auth';

interface Props {
  profile: UserProfile;
  appVersion: string | null;
  onClose: () => void;
  onDeleteAccount: () => void;
}

export default function SettingsModal({ profile, appVersion, onClose, onDeleteAccount }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-start justify-center z-50 pt-10 sm:pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-xl p-6 max-w-md w-full relative animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-primary-subtle rounded-lg transition-colors"
        >
          <X size={18} />
        </button>

        <div className="pr-6">
          <div className="w-10 h-10 rounded-xl bg-primary-subtle flex items-center justify-center mb-4">
            <Settings size={20} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-4">Account Settings</h2>

          <div className="space-y-4">
            <div className="p-3 bg-background rounded-lg">
              <p className="text-xs text-muted mb-1">Email</p>
              <p className="text-sm text-default font-medium">{profile.email}</p>
            </div>

            {appVersion && (
              <div className="p-3 bg-background rounded-lg">
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-muted" />
                  <p className="text-xs text-muted">App Version</p>
                </div>
                <p className="text-sm text-default font-medium mt-1">v{appVersion}</p>
              </div>
            )}

            <div className="pt-4 border-t border-border/20">
              <h3 className="text-sm font-medium text-error mb-2">Danger Zone</h3>
              <p className="text-xs text-muted mb-3">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button
                onClick={onDeleteAccount}
                className="w-full px-4 py-2.5 bg-error/10 hover:bg-error/20 text-error text-sm font-medium rounded-lg transition-colors"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
