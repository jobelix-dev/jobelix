/**
 * Dashboard Router Page
 *
 * Routes based on user role:
 * - Students: Full-screen wizard (always-on, IS the app)
 * - Companies: Traditional dashboard with header
 *
 * Route: /dashboard
 * Requires: Authentication (redirects to / if not authenticated)
 */

'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { UserProfile } from '@/lib/shared/types/auth';
import { api } from '@/lib/client/api';
import { apiFetch } from '@/lib/client/http';
import { getElectronAPI } from '@/lib/client/runtime';
import FeedbackModal from '@/app/components/FeedbackModal';
import WelcomeNotice from '@/app/components/WelcomeNotice';
import OnboardingSteps from '@/app/components/OnboardingSteps';
import PrivacyModal from '@/app/components/modals/PrivacyModal';
import SettingsModal from '@/app/components/modals/SettingsModal';
import DeleteAccountModal from '@/app/components/modals/DeleteAccountModal';
import DashboardHeader from './components/DashboardHeader';
import { useIsElectron } from '@/app/hooks/useClientSide';

// Code-split role-specific views — only the active role's bundle is loaded
const CompanyDashboard = dynamic(() => import('./company/CompanyDashboard'), {
  loading: () => <div className="flex justify-center py-12"><p className="text-muted">Loading dashboard...</p></div>,
});

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

export default function DashboardPage() {
  const router = useRouter();
  const isElectron = useIsElectron();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showWelcomeNotice, setShowWelcomeNotice] = useState(false);
  const [showOnboardingSteps, setShowOnboardingSteps] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load profile and redirect if unauthenticated / on error
  useEffect(() => {
    async function loadProfile() {
      const redirectOut = async (reason: string) => {
        console.log(`[Dashboard] ${reason}`);
        try {
          const electronAPI = getElectronAPI();
          if (electronAPI?.clearSession) await electronAPI.clearSession();
        } catch (e) {
          console.warn('[Dashboard] Failed to clear session:', e);
        }
        router.push('/');
      };

      try {
        const response = await api.getProfile();
        if (!response.profile) {
          await redirectOut('No profile found, redirecting to /');
          return;
        }

        setProfile(response.profile);

        if (response.profile.role === 'company' && !response.profile.has_seen_welcome_notice) {
          setShowWelcomeNotice(true);
        }
        if (response.profile.role === 'student' && !response.profile.has_seen_welcome_notice) {
          apiFetch('/api/auth/welcome-notice-seen', { method: 'POST' }).catch(() => {});
        }
      } catch (error) {
        console.error('[Dashboard] Failed to load profile:', error);
        await redirectOut('Error loading profile, redirecting to /');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  // Fetch app version in Electron
  useEffect(() => {
    const electronAPI = getElectronAPI();
    if (!electronAPI?.getAppVersion) return;
    electronAPI.getAppVersion()
      .then(setAppVersion)
      .catch((e) => console.warn('[Dashboard] Failed to get app version:', e));
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
      router.push(isElectron ? '/desktop' : '/');
    } catch (error) {
      console.error('[Dashboard] Logout failed:', error);
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
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  }

  async function handleWelcomeNoticeDismiss() {
    try {
      const res = await apiFetch('/api/auth/welcome-notice-seen', { method: 'POST' });
      if (res.ok && profile) setProfile({ ...profile, has_seen_welcome_notice: true });
    } catch (error) {
      console.error('[Dashboard] Failed to mark welcome notice seen:', error);
    } finally {
      setShowWelcomeNotice(false);
      setShowOnboardingSteps(true);
    }
  }

  function openDeleteConfirm() {
    setShowSettingsModal(false);
    setDeletePassword('');
    setDeleteError(null);
    setShowDeleteConfirm(true);
  }

  function closeDeleteConfirm() {
    setShowDeleteConfirm(false);
    setDeletePassword('');
    setDeleteError(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!profile) return null;

  const sharedModals = (
    <>
      {showPrivacyModal && <PrivacyModal onClose={() => setShowPrivacyModal(false)} />}
      {showSettingsModal && (
        <SettingsModal
          profile={profile}
          appVersion={appVersion}
          onClose={() => setShowSettingsModal(false)}
          onDeleteAccount={openDeleteConfirm}
        />
      )}
      {showDeleteConfirm && (
        <DeleteAccountModal
          isDeleting={isDeleting}
          deletePassword={deletePassword}
          deleteError={deleteError}
          onPasswordChange={setDeletePassword}
          onConfirm={handleDeleteAccount}
          onCancel={closeDeleteConfirm}
        />
      )}
      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
    </>
  );

  // ── Student: full-screen wizard IS the entire app ──
  if (profile.role === 'student') {
    return (
      <>
        <SetupWizard
          onFeedback={() => setShowFeedbackModal(true)}
          onPrivacy={() => setShowPrivacyModal(true)}
          onSettings={() => setShowSettingsModal(true)}
          onLogout={handleLogout}
        />
        {sharedModals}
      </>
    );
  }

  // ── Company: traditional dashboard with header ──
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        profile={profile}
        onFeedback={() => setShowFeedbackModal(true)}
        onPrivacy={() => setShowPrivacyModal(true)}
        onSettings={() => setShowSettingsModal(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <CompanyDashboard />
      </main>

      {sharedModals}

      <WelcomeNotice isOpen={showWelcomeNotice} onClose={handleWelcomeNoticeDismiss} />
      <OnboardingSteps
        isOpen={showOnboardingSteps}
        onClose={() => setShowOnboardingSteps(false)}
        userRole={profile.role}
      />
    </div>
  );
}
