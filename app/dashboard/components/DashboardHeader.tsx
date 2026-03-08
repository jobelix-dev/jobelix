'use client';

import { useRef, useState, useEffect } from 'react';
import { Shield, MessageSquare, LogOut, MoreHorizontal, Settings } from 'lucide-react';
import { UserProfile } from '@/lib/shared/types/auth';

function getDisplayRole(dbRole: string): string {
  if (dbRole === 'student') return 'top talent';
  if (dbRole === 'company') return 'employer';
  return dbRole;
}

interface Props {
  profile: UserProfile;
  onFeedback: () => void;
  onPrivacy: () => void;
  onSettings: () => void;
  onLogout: () => void;
}

export default function DashboardHeader({ profile, onFeedback, onPrivacy, onSettings, onLogout }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <header className="sticky top-0 z-[60] bg-surface/95 backdrop-blur-sm border-b border-border/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-bold text-default">Jobelix</h1>
            <span className="hidden sm:inline text-xs text-muted bg-primary-subtle/50 px-2 py-0.5 rounded-full">
              {getDisplayRole(profile.role)}
            </span>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={onFeedback}
              className="p-2 rounded-lg text-muted hover:text-default hover:bg-primary-subtle/50 transition-colors cursor-pointer"
              title="Send Feedback"
            >
              <MessageSquare size={18} />
            </button>
            <button
              onClick={onPrivacy}
              className="p-2 rounded-lg text-muted hover:text-default hover:bg-primary-subtle/50 transition-colors cursor-pointer"
              title="Privacy Info"
            >
              <Shield size={18} />
            </button>
            <button
              onClick={onSettings}
              className="p-2 rounded-lg text-muted hover:text-default hover:bg-primary-subtle/50 transition-colors cursor-pointer"
              title="Account Settings"
            >
              <Settings size={18} />
            </button>
            <div className="w-px h-5 bg-border/30 mx-1" />
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted hover:text-default hover:bg-primary-subtle/50 transition-colors cursor-pointer"
            >
              <LogOut size={16} />
              <span>Log out</span>
            </button>
          </div>

          {/* Mobile Menu */}
          <div className="sm:hidden relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg text-muted hover:text-default hover:bg-primary-subtle/50 transition-colors"
            >
              <MoreHorizontal size={20} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-surface rounded-xl shadow-lg border border-border/30 py-1 z-[100]">
                <button
                  onClick={() => { onFeedback(); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-default active:bg-primary-subtle/50 transition-colors"
                >
                  <MessageSquare size={16} className="text-muted" />
                  Feedback
                </button>
                <button
                  onClick={() => { onPrivacy(); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-default active:bg-primary-subtle/50 transition-colors"
                >
                  <Shield size={16} className="text-muted" />
                  Privacy
                </button>
                <button
                  onClick={() => { onSettings(); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-default active:bg-primary-subtle/50 transition-colors"
                >
                  <Settings size={16} className="text-muted" />
                  Settings
                </button>
                <div className="h-px bg-border/20 my-1" />
                <button
                  onClick={() => { onLogout(); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error active:bg-error-subtle transition-colors"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
