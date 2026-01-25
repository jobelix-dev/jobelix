/**
 * Talent Dashboard Component
 * 
 * Main interface for talents to manage their profile.
 * Features: Manual profile editing, PDF upload with AI extraction.
 * ProfileEditor always visible - allows manual entry or displays AI-extracted data.
 * Note: Component/folder uses "student" for DB compatibility, UI shows "talent"
 */

'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardNav from './components/DashboardNav';
import { ProfileTab } from './features/profile';
import { MatchesTab } from './features/matches';
import { JobPreferencesTab } from './features/job-preferences';
import { AutoApplyTab } from './features/auto-apply';
import { useProfileData, useResumeUpload, useGitHubImportDashboard } from './hooks';

type DashboardTab = 'profile' | 'matches' | 'job-preferences' | 'auto-apply';

// Inner component that uses useSearchParams
function StudentDashboardContent() {
  const searchParams = useSearchParams();
  
  // Active tab state - initialize from URL param if present
  const [activeTab, setActiveTab] = useState<DashboardTab>('profile');
  const [jobPreferencesUnsaved, setJobPreferencesUnsaved] = useState(false);
  
  // Read tab from URL on mount (e.g., after Stripe redirect)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'matches', 'job-preferences', 'auto-apply'].includes(tabParam)) {
      setActiveTab(tabParam as DashboardTab);
    }
  }, [searchParams]);
  
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

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [jobPreferencesUnsaved]);

  const handleTabChange = (nextTab: DashboardTab) => {
    if (activeTab === 'job-preferences' && nextTab !== 'job-preferences' && jobPreferencesUnsaved) {
      const shouldLeave = window.confirm('You have unsaved job preferences. Leave without saving?');
      if (!shouldLeave) {
        return;
      }
    }

    setActiveTab(nextTab);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Dashboard Navigation */}
        <DashboardNav activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Tab Content */}
        <div className="space-y-8">
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
              importingGitHub={gitHubState.importingGitHub}
              githubImportProgress={gitHubState.importProgress}
              onGitHubImport={gitHubState.importGitHubData}
            />
          )}

          {activeTab === 'matches' && <MatchesTab />}

          {activeTab === 'job-preferences' && (
            <JobPreferencesTab onUnsavedChanges={setJobPreferencesUnsaved} />
          )}

          {activeTab === 'auto-apply' && <AutoApplyTab />}
        </div>
      </div>
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
