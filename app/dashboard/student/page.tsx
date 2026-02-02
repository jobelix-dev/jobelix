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
import DashboardNav from './components/DashboardNav';
import { ProfileTab } from './features/profile';
import { MatchesTab } from './features/matches';
import { JobPreferencesTab } from './features/job-preferences';
import { AutoApplyTab } from './features/auto-apply';
import { useProfileData, useResumeUpload, useGitHubImportDashboard } from './hooks';
import { useConfirmDialog } from '@/app/components/useConfirmDialog';
import { restoreFocusAfterDialog } from '@/lib/client/focusRestore';

type DashboardTab = 'profile' | 'matches' | 'job-preferences' | 'auto-apply';

const VALID_TABS = ['profile', 'matches', 'job-preferences', 'auto-apply'] as const;

// Inner component that uses useSearchParams
function StudentDashboardContent() {
  const searchParams = useSearchParams();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  
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

  const handleTabChange = async (nextTab: DashboardTab) => {
    if (activeTab === 'job-preferences' && nextTab !== 'job-preferences' && jobPreferencesUnsaved) {
      const shouldLeave = await confirm('You have unsaved job preferences. Leave without saving?', {
        title: 'Unsaved Changes',
        confirmText: 'Leave',
        cancelText: 'Stay',
        variant: 'danger'
      });
      if (!shouldLeave) {
        return;
      }
      // User confirmed leaving, reset the unsaved flag
      setJobPreferencesUnsaved(false);
    }

    setActiveTab(nextTab);
  };

  return (
    <div>
      {/* Dashboard Navigation */}
      <DashboardNav activeTab={activeTab} onTabChange={handleTabChange} />

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
