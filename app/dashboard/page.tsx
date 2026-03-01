/**
 * Dashboard Router Page
 * 
 * Main dashboard that routes based on user role:
 * - Students: Full-screen wizard (always-on, IS the app)
 * - Companies: Traditional dashboard with header
 * 
 * Route: /dashboard
 * Requires: Authentication (redirects to / if not authenticated)
 * Note: DB stores role as student/company, UI displays as talent/employer
 */

'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { UserProfile } from '@/lib/shared/types';
import { api } from '@/lib/client/api';
import { clearCachedAuthTokens } from '@/lib/client/authCache';
import { apiFetch } from '@/lib/client/http';
import { getElectronAPI } from '@/lib/client/runtime';
import { Shield, X, MessageSquare, LogOut, MoreHorizontal, Settings, AlertTriangle, Info } from 'lucide-react';
import FeedbackModal from '@/app/components/FeedbackModal';
import WelcomeNotice from '@/app/components/WelcomeNotice';
import OnboardingSteps from '@/app/components/OnboardingSteps';
import { useIsElectron } from '@/app/hooks/useClientSide';

// Code-split role-specific views — only the active role's bundle is loaded
const CompanyDashboard = dynamic(() => import('./company/page'), {
  loading: () => <div className="flex justify-center py-12"><p className="text-muted">Loading dashboard...</p></div>,
});

// Student wizard — the entire student app experience (code-split)
const SetupWizard = dynamic(() => import('./student/features/wizard/SetupWizard'), {
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted">Loading...</p>
      </div>
    </div>
  ),
});

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
  const [showWelcomeNotice, setShowWelcomeNotice] = useState(false);
  const [showOnboardingSteps, setShowOnboardingSteps] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside (company header mobile menu)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
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
      const redirectToHomeWithClearedCache = async (reason: string) => {
        console.log(`[Dashboard] ${reason}`);
        try {
          await clearCachedAuthTokens();
        } catch (cacheError) {
          console.warn('Failed to clear auth cache on session invalidation:', cacheError);
        }
        router.push('/');
      };

      try {
        console.log('[Dashboard] Starting profile load')
        const response = await api.getProfile();
        console.log('[Dashboard] Profile loaded:', response.profile ? 'success' : 'no profile')
        
        if (!response.profile) {
          await redirectToHomeWithClearedCache('No profile found, clearing cache and redirecting to /');
          return;
        }

        setProfile(response.profile);
        
        // Show welcome notice for company users if not seen yet
        // (Students don't need it — the wizard is their onboarding)
        if (response.profile.role === 'company' && !response.profile.has_seen_welcome_notice) {
          setShowWelcomeNotice(true);
        }

        // Dismiss welcome notice for students automatically
        if (response.profile.role === 'student' && !response.profile.has_seen_welcome_notice) {
          apiFetch('/api/auth/welcome-notice-seen', {
            method: 'POST',
          }).catch(() => {}); // fire-and-forget
        }
      } catch (error) {
        console.error('[Dashboard] Failed to load profile:', error);
        await redirectToHomeWithClearedCache('Clearing cache and redirecting to / due to error');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  // Fetch app version in Electron
  useEffect(() => {
    async function fetchAppVersion() {
      const electronAPI = getElectronAPI();
      if (electronAPI?.getAppVersion) {
        try {
          const version = await electronAPI.getAppVersion();
          setAppVersion(version);
        } catch (error) {
          console.warn('Failed to get app version:', error);
        }
      }
    }
    fetchAppVersion();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
      router.push(isElectron ? '/desktop' : '/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [isElectron, router]);

  async function handleDeleteAccount() {
    if (isDeleting) return;
    
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await api.deleteAccount(deletePassword || undefined);
      router.push(isElectron ? '/desktop' : '/');
    } catch (error) {
      console.error('Delete account failed:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  }

  async function handleWelcomeNoticeDismiss() {
    try {
      const response = await apiFetch('/api/auth/welcome-notice-seen', {
        method: 'POST',
      });

      if (response.ok && profile) {
        setProfile({ ...profile, has_seen_welcome_notice: true });
      }
    } catch (error) {
      console.error('Failed to mark welcome notice as seen:', error);
    } finally {
      setShowWelcomeNotice(false);
      setShowOnboardingSteps(true);
    }
  }

  // --- Callbacks for wizard header dropdown ---
  const handleOpenFeedback = useCallback(() => setShowFeedbackModal(true), []);
  const handleOpenPrivacy = useCallback(() => setShowPrivacyModal(true), []);
  const handleOpenSettings = useCallback(() => setShowSettingsModal(true), []);

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

  // =========================================================================
  // STUDENT: Full-screen wizard IS the entire app
  // =========================================================================
  if (profile.role === 'student') {
    return (
      <>
        <SetupWizard
          onFeedback={handleOpenFeedback}
          onPrivacy={handleOpenPrivacy}
          onSettings={handleOpenSettings}
          onLogout={handleLogout}
        />

        {/* Modals render on top of wizard */}
        {renderPrivacyModal()}
        {renderSettingsModal()}
        {renderDeleteConfirmModal()}
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
        />
      </>
    );
  }

  // =========================================================================
  // COMPANY: Traditional dashboard with header
  // =========================================================================
  return (
    <div className="min-h-screen bg-background">
      {/* Clean Header Bar */}
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
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-2 rounded-lg text-muted hover:text-default hover:bg-primary-subtle/50 transition-colors cursor-pointer"
                title="Account Settings"
              >
                <Settings size={18} />
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
                  <button
                    onClick={() => { setShowSettingsModal(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-default active:bg-primary-subtle/50 transition-colors"
                  >
                    <Settings size={16} className="text-muted" />
                    Settings
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
        <CompanyDashboard />
      </main>

      {/* Modals */}
      {renderPrivacyModal()}
      {renderSettingsModal()}
      {renderDeleteConfirmModal()}

      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
      />

      {/* Welcome Notice — company users only */}
      <WelcomeNotice
        isOpen={showWelcomeNotice}
        onClose={handleWelcomeNoticeDismiss}
      />

      {/* Onboarding Steps — company users only */}
      <OnboardingSteps
        isOpen={showOnboardingSteps}
        onClose={() => setShowOnboardingSteps(false)}
        userRole={profile.role}
      />
    </div>
  );

  // =========================================================================
  // Shared Modal Renderers
  // =========================================================================

  function renderPrivacyModal() {
    if (!showPrivacyModal) return null;
    return (
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-start justify-center z-50 pt-10 sm:pt-20 px-4 overflow-y-auto"
        onClick={() => setShowPrivacyModal(false)}
      >
        <div 
          className="bg-surface rounded-2xl shadow-xl p-6 max-w-lg w-full relative animate-scale-in my-4"
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
            
            <div className="space-y-4 text-sm text-muted">
              <div>
                <h3 className="font-medium text-default mb-1">What we collect</h3>
                <p>Profile info (name, email, phone), resume/CV data, job preferences, and payment info (processed securely via Stripe).</p>
              </div>
              
              <div>
                <h3 className="font-medium text-default mb-1">How we use it</h3>
                <p>Resume tailoring, LinkedIn question answering, and auto-apply functionality. We use your data only to provide these services.</p>
              </div>
              
              <div>
                <h3 className="font-medium text-default mb-1">Where it&apos;s stored</h3>
                <p>Your data is stored in Supabase (PostgreSQL) with Row Level Security. This means you can only access your own data and no other user can see yours.</p>
              </div>
              
              <div>
                <h3 className="font-medium text-default mb-1">Third-party services</h3>
                <p><strong className="text-default">OpenAI:</strong> Used for resume parsing. They operate under a zero-retention API policy - they do not train on your data.</p>
                <p className="mt-1"><strong className="text-default">Stripe:</strong> Handles payment processing only.</p>
                <p className="mt-1 text-default font-medium">We do not sell your data to recruiters, data brokers, or anyone else.</p>
              </div>
              
              <div>
                <h3 className="font-medium text-default mb-1">Your rights (GDPR)</h3>
                <p>You can access, rectify, or delete your data at any time. Use the Settings menu to delete your account and all associated data permanently.</p>
              </div>
              
              <div>
                <h3 className="font-medium text-default mb-1">Data retention</h3>
                <p>Your data is retained while your account is active. When you delete your account, all data is permanently removed immediately.</p>
                <p className="mt-1">If we ever shut down the service, we will wipe the entire database.</p>
              </div>
              
              <div className="pt-3 border-t border-border/20">
                <p>
                  <strong className="text-default">Contact:</strong>{' '}
                  <a 
                    href="mailto:jobelix.contact@gmail.com" 
                    className="text-info hover:underline"
                  >
                    jobelix.contact@gmail.com
                  </a>
                </p>
                <p className="text-xs mt-2">We respond within 30 days &bull; Updated January 2025</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderSettingsModal() {
    if (!showSettingsModal || !profile) return null;
    return (
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-start justify-center z-50 pt-10 sm:pt-20 px-4"
        onClick={() => setShowSettingsModal(false)}
      >
        <div 
          className="bg-surface rounded-2xl shadow-xl p-6 max-w-md w-full relative animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowSettingsModal(false)}
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
              {/* Account Info */}
              <div className="p-3 bg-background rounded-lg">
                <p className="text-xs text-muted mb-1">Email</p>
                <p className="text-sm text-default font-medium">{profile.email}</p>
              </div>
              
              {/* App Version (Electron only) */}
              {appVersion && (
                <div className="p-3 bg-background rounded-lg">
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-muted" />
                    <p className="text-xs text-muted">App Version</p>
                  </div>
                  <p className="text-sm text-default font-medium mt-1">v{appVersion}</p>
                </div>
              )}
              
              {/* Danger Zone */}
              <div className="pt-4 border-t border-border/20">
                <h3 className="text-sm font-medium text-error mb-2">Danger Zone</h3>
                <p className="text-xs text-muted mb-3">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    setDeletePassword('');
                    setDeleteError(null);
                    setShowDeleteConfirm(true);
                  }}
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

  function renderDeleteConfirmModal() {
    if (!showDeleteConfirm) return null;
    return (
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] px-4"
        onClick={() => {
          if (!isDeleting) {
            setShowDeleteConfirm(false);
            setDeletePassword('');
            setDeleteError(null);
          }
        }}
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
                onChange={(e) => setDeletePassword(e.target.value)}
                disabled={isDeleting}
                className="w-full px-3 py-2 bg-background border border-border/30 rounded-lg text-sm text-default focus:outline-none focus:ring-2 focus:ring-error/40"
              />
            </div>

            {deleteError && (
              <p className="text-xs text-error mb-4 text-left">{deleteError}</p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-background hover:bg-primary-subtle/50 text-default text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
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
}
