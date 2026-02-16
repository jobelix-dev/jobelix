/**
 * Profile Tab Content
 * 
 * Contains the existing profile functionality:
 * - Resume upload
 * - Profile editor
 * - AI assistant
 */

'use client';

import { useState, Dispatch, SetStateAction, Suspense } from 'react';
import ProfileEditorSection from './sections/ProfileEditorSection';
import HeaderSection from './sections/HeaderSection';
import type { ExtractedResumeData, ProjectEntry, SkillEntry } from '@/lib/shared/types';
import { RESUME_EXTRACTION_STEPS } from '@/lib/shared/extractionSteps';
import { ProfileValidationResult } from '@/lib/client/profileValidation';
import ValidationTour from '@/app/dashboard/student/components/ValidationTour';
import { useConfirmDialog } from '@/app/components/useConfirmDialog';
import { useProfileTour, useRepoTicker } from './hooks';

interface ProfileTabProps {
  profileData: ExtractedResumeData;
  setProfileData: Dispatch<SetStateAction<ExtractedResumeData>>;
  validation: ProfileValidationResult;
  draftId: string | null;
  draftStatus: 'editing' | 'published';
  resumeInfo: { filename?: string; uploaded_at?: string } | null;
  uploading: boolean;
  extracting: boolean;
  uploadSuccess: boolean;
  uploadError: string;
  extractionProgress?: {
    stepIndex: number;
    step: string;
    progress: number;
    complete?: boolean;
    updatedAt: string;
  } | null;
  githubImportProgress?: {
    step: string;
    progress: number;
    reposProcessed: number;
    reposTotal: number;
    batchRepos: string[];
    complete?: boolean;
    updatedAt: string;
  } | null;
  finalizing: boolean;
  saveSuccess: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDownload: () => void;
  handleFinalize: () => void;
  importingGitHub: boolean;
  onGitHubImport: (currentProjects: ProjectEntry[], currentSkills: SkillEntry[], onComplete?: (projects: ProjectEntry[], skills: SkillEntry[]) => void) => Promise<{ projects: ProjectEntry[]; skills: SkillEntry[] } | null>;
}

export default function ProfileTab({
  profileData,
  setProfileData,
  validation,
  draftId: _draftId,
  draftStatus,
  resumeInfo,
  uploading,
  extracting,
  uploadSuccess,
  uploadError,
  extractionProgress,
  githubImportProgress,
  finalizing,
  saveSuccess,
  handleFileChange,
  handleDownload,
  handleFinalize,
  importingGitHub,
  onGitHubImport,
}: ProfileTabProps) {
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  
  const resumeUploadSteps = [
    'Validating file',
    'Uploading to secure storage',
    'Preparing extraction',
  ];

  const resumeExtractionSteps = RESUME_EXTRACTION_STEPS;

  const _githubImportSteps = ['Analyzing repositories'];

  const loadingEstimatedMs = extracting ? 45000 : uploading ? 7000 : importingGitHub ? 12000 : undefined;
  const extractionStepIndex = extractionProgress?.stepIndex;
  const extractionProgressPercent = extractionProgress?.progress;
  const githubProgressPercent = importingGitHub ? (githubImportProgress?.progress ?? 0) : undefined;
  const githubRepos = githubImportProgress?.batchRepos || [];
  
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);
  const [expandedEducationIndex, setExpandedEducationIndex] = useState<number | null>(null);
  const [expandedExperienceIndex, setExpandedExperienceIndex] = useState<number | null>(null);
  const [expandedPublicationIndex, setExpandedPublicationIndex] = useState<number | null>(null);
  const [expandedCertificationIndex, setExpandedCertificationIndex] = useState<number | null>(null);

  const { visibleRepos, repoTickerIndex } = useRepoTicker(githubRepos, importingGitHub);

  const {
    profileTourOpen,
    profileTourSteps,
    profileTourIndex,
    startProfileTour,
    handleProfileTourNext,
    handleProfileTourBack,
    handleProfileTourExit,
  } = useProfileTour(
    validation,
    setExpandedEducationIndex,
    setExpandedExperienceIndex,
    setExpandedPublicationIndex,
    setExpandedCertificationIndex,
    setEditingProjectIndex
  );

  const handleProfileSave = () => {
    if (!validation.isValid) {
      startProfileTour();
      return;
    }
    if (profileTourOpen) {
      handleProfileTourExit();
    }
    handleFinalize();
  };

  const githubStepLabel = visibleRepos.length > 0
    ? `Parsing repo: ${visibleRepos[repoTickerIndex]}`
    : 'Collecting repositories';

  const loadingSteps = extracting
    ? resumeExtractionSteps
    : uploading
      ? resumeUploadSteps
      : importingGitHub
        ? [githubStepLabel]
        : undefined;

  const currentProfileTourStep = profileTourSteps[profileTourIndex] ?? null;
  const isProfileCompletionStep = profileTourSteps[0]?.id === 'complete';

  // Handler for GitHub import completion - ONLY update projects and skills
  const handleGitHubImport = (projects: ProjectEntry[], skills: SkillEntry[]) => {
    // Preserve ALL existing profile data, only update projects and skills
    // Using functional update to avoid stale closure issues
    setProfileData((prevData) => ({
      ...prevData,
      projects,
      skills,
    }));
  };

  return (
    <>
      {/* Header Section with Resume Upload and GitHub Integration */}
      <Suspense fallback={
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold">Complete Your Profile</h1>
              <p className="text-sm text-muted mt-1">
                Loading...
              </p>
            </div>
          </div>
        </div>
      }>
        <HeaderSection
          resumeInfo={resumeInfo}
          uploading={uploading}
          extracting={extracting}
          uploadSuccess={uploadSuccess}
          uploadError={uploadError}
          onFileChange={handleFileChange}
          onDownload={handleDownload}
          currentProjects={profileData.projects}
          currentSkills={profileData.skills}
          onGitHubImportComplete={handleGitHubImport}
          onGitHubImport={onGitHubImport}
          importingGitHub={importingGitHub}
          draftStatus={draftStatus}
        />
      </Suspense>

      {/* Profile Editor */}
      <ProfileEditorSection
        data={profileData}
        onChange={setProfileData}
        onSave={handleProfileSave}
        isSaving={finalizing}
        canSave={validation.isValid}
        validation={profileTourOpen ? validation : undefined}
        disabled={uploading || extracting || importingGitHub}
        loadingMessage={extracting ? 'Parsing your resume with AI...' : uploading ? 'Uploading your resume...' : importingGitHub ? 'AI is analyzing your GitHub repositories' : undefined}
        loadingSubmessage={extracting ? 'This can take a few minutes. Extracting section by section.' : uploading ? 'Uploading your PDF securely' : importingGitHub ? 'Reviewing code and README files to build projects and skills' : undefined}
        loadingSteps={loadingSteps}
        loadingEstimatedMs={loadingEstimatedMs}
        loadingStepIndex={extracting ? extractionStepIndex : undefined}
        loadingProgress={extracting ? extractionProgressPercent : importingGitHub ? githubProgressPercent : undefined}
        saveSuccess={saveSuccess}
        editingProjectIndex={editingProjectIndex}
        onEditingProjectIndexChange={setEditingProjectIndex}
        expandedEducationIndex={expandedEducationIndex}
        expandedExperienceIndex={expandedExperienceIndex}
        expandedPublicationIndex={expandedPublicationIndex}
        expandedCertificationIndex={expandedCertificationIndex}
        onConfirmDelete={(message) => confirm(message, { title: 'Delete Project', variant: 'danger', confirmText: 'Delete', cancelText: 'Cancel' })}
      />

      <ValidationTour
        isOpen={profileTourOpen}
        step={currentProfileTourStep}
        onNext={isProfileCompletionStep ? handleProfileSave : handleProfileTourNext}
        onBack={handleProfileTourBack}
        onExit={handleProfileTourExit}
        nextLabel={isProfileCompletionStep ? 'Save' : 'Next'}
        allowScroll={isProfileCompletionStep}
      />
      
      {ConfirmDialogComponent}
    </>
  );
}
