/**
 * Dashboard Router Page
 * 
 * Main dashboard that routes to talent or employer views based on user role.
 * Route: /dashboard
 * Requires: Authentication (redirects to /login if not authenticated)
 * Renders: TalentDashboard or EmployerDashboard based on user profile.
 * Note: DB stores role as student/company, UI displays as talent/employer
 */

'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/lib/shared/types';
import { api } from '@/lib/client/api';
import { Shield, X, MessageSquare, LogOut, MoreHorizontal } from 'lucide-react';
import FeedbackModal from '@/app/components/FeedbackModal';
import StudentDashboard from './student/page';
import CompanyDashboard from './company/page';
import { useIsElectron } from '@/app/hooks/useClientSide';

// Map DB role to display role
function getDisplayRole(dbRole: string): string {
  if (dbRole === 'student') return 'top talent';
  if (dbRole === 'company') return 'employer';
  return dbRole;
}

export default function DashboardPage() {
  const router = useRouter();
  const isElectron = useIsElectron();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      // Use both mouse and touch events for better mobile support
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu]);

  useEffect(() => {
    async function loadProfile() {
      try {
        console.log('[Dashboard] Starting profile load')
        const response = await api.getProfile();
        console.log('[Dashboard] Profile API response:', response)
        
        if (!response.profile) {
          console.log('[Dashboard] No profile found, clearing cache and redirecting to /')
          // Clear cache if profile loading fails (invalid session)
          if (typeof window !== 'undefined' && window.electronAPI?.clearAuthCache) {
            try {
              await window.electronAPI.clearAuthCache();
            } catch (cacheError) {
              console.warn('Failed to clear auth cache on session invalidation:', cacheError);
            }
          }
          router.push('/');
          return;
        }

        setProfile(response.profile);
      } catch (error) {
        console.error('[Dashboard] Failed to load profile:', error);
        console.log('[Dashboard] Clearing cache and redirecting to / due to error')
        // Clear cache if profile loading fails (invalid session)
        if (typeof window !== 'undefined' && window.electronAPI?.clearAuthCache) {
          try {
            await window.electronAPI.clearAuthCache();
          } catch (cacheError) {
            console.warn('Failed to clear auth cache on session invalidation:', cacheError);
          }
        }
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  async function handleLogout() {
    try {
      await api.logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return null; // will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Clean Header Bar - z-[60] to be above TitleBar (z-[50]) but below WindowControls (z-[9999]) */}
      {/* In Electron: outer header is draggable, inner content is not (allows clicking buttons) */}
      {/* On desktop (sm:+), right padding avoids overlap with window controls */}
      <header 
        className={`sticky top-0 z-[60] bg-surface/95 backdrop-blur-sm border-b border-border/20 ${
          isElectron ? 'sm:pr-[144px]' : ''
        }`}
        style={isElectron ? { WebkitAppRegion: 'drag' } as React.CSSProperties : undefined}
      >
        <div 
          className="max-w-5xl mx-auto px-4 sm:px-6"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <div className="flex items-center justify-between h-14">
            {/* Logo / Title */}
            <div className="flex items-center gap-3">
              <h1 className="text-lg sm:text-xl font-bold text-default">Jobelix</h1>
              <span className="hidden sm:inline text-xs text-muted bg-primary-subtle/50 px-2 py-0.5 rounded-full">
                {getDisplayRole(profile.role)}
              </span>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2 relative z-[60]">
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="p-2 rounded-lg text-muted hover:text-default hover:bg-primary-subtle/50 transition-colors cursor-pointer"
                title="Send Feedback"
              >
                <MessageSquare size={18} />
              </button>
              <button
                onClick={() => setShowPrivacyModal(true)}
                className="p-2 rounded-lg text-muted hover:text-default hover:bg-primary-subtle/50 transition-colors cursor-pointer"
                title="Privacy Info"
              >
                <Shield size={18} />
              </button>
              <div className="w-px h-5 bg-border/30 mx-1" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted hover:text-default hover:bg-primary-subtle/50 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
                <span>Log out</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="sm:hidden relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg text-muted hover:text-default hover:bg-primary-subtle/50 transition-colors"
              >
                <MoreHorizontal size={20} />
              </button>
              
              {/* Mobile Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-surface rounded-xl shadow-lg border border-border/30 py-1 z-[100]">
                  <button
                    onClick={() => { setShowFeedbackModal(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-default active:bg-primary-subtle/50 transition-colors"
                  >
                    <MessageSquare size={16} className="text-muted" />
                    Feedback
                  </button>
                  <button
                    onClick={() => { setShowPrivacyModal(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-default active:bg-primary-subtle/50 transition-colors"
                  >
                    <Shield size={16} className="text-muted" />
                    Privacy
                  </button>
                  <div className="h-px bg-border/20 my-1" />
                  <button
                    onClick={() => { handleLogout(); setShowMenu(false); }}
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

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {profile.role === 'student' && <StudentDashboard />}
        {profile.role === 'company' && <CompanyDashboard />}
      </main>

      {/* Privacy Modal */}
      {showPrivacyModal && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-start justify-center z-50 pt-20 px-4"
          onClick={() => setShowPrivacyModal(false)}
        >
          <div 
            className="bg-surface rounded-2xl shadow-xl p-6 max-w-md w-full relative animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-primary-subtle rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
            
            <div className="pr-6">
              <div className="w-10 h-10 rounded-xl bg-primary-subtle flex items-center justify-center mb-4">
                <Shield size={20} className="text-primary" />
              </div>
              <h2 className="text-lg font-semibold mb-4">Data & Privacy</h2>
              
              <div className="space-y-3 text-sm text-muted">
                <p>
                  We process your personal data (profile, resume, applications) in accordance with GDPR.
                </p>
                
                <p>
                  <strong className="text-default">Your rights:</strong> Access, rectify, erase, or export your data at any time.
                </p>

                <p>
                  <strong className="text-default">Contact:</strong>{' '}
                  <a 
                    href="mailto:jobelix.contact@gmail.com" 
                    className="text-info hover:underline"
                  >
                    jobelix.contact@gmail.com
                  </a>
                </p>
                
                <p className="text-xs pt-2 border-t border-border/20">
                  We respond within 30 days • Updated January 2025
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
      />
    </div>
  );
}
