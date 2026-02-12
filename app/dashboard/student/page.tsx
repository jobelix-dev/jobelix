/**
 * Talent Dashboard Component
 * 
 * Main interface for talents to manage their profile.
 * Features: Manual profile editing, PDF upload with AI extraction.
 * ProfileEditor always visible - allows manual entry or displays AI-extracted data.
 * Note: Component/folder uses "student" for DB compatibility, UI shows "talent"
 */

'use client';
import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import DashboardNav from './components/DashboardNav';
import { ProfileTab } from './features/profile';
import { useProfileData, useResumeUpload, useGitHubImportDashboard } from './hooks';
import { useConfirmDialog } from '@/app/components/useConfirmDialog';
import { restoreFocusAfterDialog } from '@/lib/client/focusRestore';

// Lazy-load non-default tabs - only fetched when user navigates to them
// Import directly from component files (not barrels) for clean code splitting
const MatchesTab = dynamic(() => import('./features/matches/MatchesTab'), {
  loading: () => <TabSkeleton />,
});
const JobPreferencesTab = dynamic(() => import('./features/job-preferences/JobPreferencesTab'), {
  loading: () => <TabSkeleton />,
});
const AutoApplyTab = dynamic(() => import('./features/auto-apply/AutoApplyTab'), {
  loading: () => <TabSkeleton />,
});

function TabSkeleton() {
  return <div className="flex justify-center py-8"><p className="text-muted">Loading...</p></div>;
}

type DashboardTab = 'profile' | 'matches' | 'job-preferences' | 'auto-apply';

const VALID_TABS = ['profile', 'matches', 'job-preferences', 'auto-apply'] as const;

// Inner component that uses useSearchParams
function StudentDashboardContent() {
  const searchParams = useSearchParams();
  const { confirm: _confirm, ConfirmDialogComponent } = useConfirmDialog();
  
  // Derive initial tab from URL param (computed once on mount via useMemo)
  const initialTab = useMemo(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam as DashboardTab)) {
      return tabParam as DashboardTab;
    }
    return 'profile';
  }, [searchParams]);
  
  // Active tab state - initialize from URL param if present
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [jobPreferencesUnsaved, setJobPreferencesUnsaved] = useState(false);
  
  // Profile data management (custom hook)
  const profileState = useProfileData();
  
  // Resume upload management (custom hook)
  const resumeState = useResumeUpload({
    setProfileData: profileState.setProfileData,
    setDraftId: profileState.setDraftId,
    setIsDataLoaded: profileState.setIsDataLoaded,
  });

  // GitHub import management (custom hook)
  const gitHubState = useGitHubImportDashboard();

  useEffect(() => {
    if (!jobPreferencesUnsaved) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const handleWindowFocus = () => {
      restoreFocusAfterDialog();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [jobPreferencesUnsaved]);

  return (
    <div>
      {/* Dashboard Navigation */}
      <DashboardNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        profileHasUnsaved={profileState.draftStatus === 'editing'}
        preferencesHasUnsaved={jobPreferencesUnsaved}
      />

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'profile' && (
            <ProfileTab
              profileData={profileState.profileData}
              setProfileData={profileState.setProfileData}
              validation={profileState.validation}
              draftId={profileState.draftId}
              draftStatus={profileState.draftStatus}
              resumeInfo={resumeState.resumeInfo}
              uploading={resumeState.uploading}
              extracting={resumeState.extracting}
              uploadSuccess={resumeState.uploadSuccess}
              uploadError={resumeState.uploadError}
              extractionProgress={resumeState.extractionProgress}
              finalizing={profileState.finalizing}
              saveSuccess={profileState.saveSuccess}
              handleFileChange={resumeState.handleFileChange}
              handleDownload={resumeState.handleDownload}
              handleFinalize={profileState.handleFinalize}
              importingGitHub={gitHubState.importing}
              githubImportProgress={gitHubState.progress}
              onGitHubImport={gitHubState.importGitHubData}
            />
          )}

          {activeTab === 'matches' && <MatchesTab />}

          {activeTab === 'job-preferences' && (
            <JobPreferencesTab onUnsavedChanges={setJobPreferencesUnsaved} />
          )}

          {activeTab === 'auto-apply' && <AutoApplyTab />}
        </div>
      {ConfirmDialogComponent}
    </div>
  );
}

// Wrapper component with Suspense boundary for useSearchParams
export default function StudentDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted">Loading dashboard...</p>
      </div>
    }>
      <StudentDashboardContent />
    </Suspense>
  );
}
