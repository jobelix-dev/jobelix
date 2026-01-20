/**
 * Student Dashboard Component
 * 
 * Main interface for students to manage their profile.
 * Features: Manual profile editing, PDF upload with AI extraction.
 * ProfileEditor always visible - allows manual entry or displays AI-extracted data.
 */

'use client';
import { useState } from 'react';
import DashboardNav from './components/DashboardNav';
import { ProfileTab } from './features/profile';
import { MatchesTab } from './features/matches';
import { JobPreferencesTab } from './features/job-preferences';
import { AutoApplyTab } from './features/auto-apply';
import { useProfileData, useResumeUpload } from './hooks';

type DashboardTab = 'profile' | 'matches' | 'job-preferences' | 'auto-apply';

export default function StudentDashboard() {
  // Active tab state
  const [activeTab, setActiveTab] = useState<DashboardTab>('profile');
  
  // Profile data management (custom hook)
  const profileState = useProfileData();
  
  // Resume upload management (custom hook)
  const resumeState = useResumeUpload({
    setProfileData: profileState.setProfileData,
    setDraftId: profileState.setDraftId,
    setIsDataLoaded: profileState.setIsDataLoaded,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Dashboard Navigation */}
        <DashboardNav activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'profile' && (
            <ProfileTab
              profileData={profileState.profileData}
              setProfileData={profileState.setProfileData}
              validation={profileState.validation}
              showValidationErrors={profileState.showValidationErrors}
              showValidationMessage={profileState.showValidationMessage}
              draftId={profileState.draftId}
              draftStatus={profileState.draftStatus}
              resumeInfo={resumeState.resumeInfo}
              uploading={resumeState.uploading}
              extracting={resumeState.extracting}
              uploadSuccess={resumeState.uploadSuccess}
              uploadError={resumeState.uploadError}
              finalizing={profileState.finalizing}
              saveSuccess={profileState.saveSuccess}
              handleFileChange={resumeState.handleFileChange}
              handleDownload={resumeState.handleDownload}
              handleFinalize={profileState.handleFinalize}
            />
          )}

          {activeTab === 'matches' && <MatchesTab />}

          {activeTab === 'job-preferences' && <JobPreferencesTab />}

          {activeTab === 'auto-apply' && <AutoApplyTab />}
        </div>
      </div>
    </div>
  );
}
