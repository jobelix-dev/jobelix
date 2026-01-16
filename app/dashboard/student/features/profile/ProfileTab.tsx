/**
 * Profile Tab Content
 * 
 * Contains the existing profile functionality:
 * - Resume upload
 * - Profile editor
 * - AI assistant
 */

'use client';

import { useState, Dispatch, SetStateAction } from 'react';
import { api } from '@/lib/client/api';
import ProfileEditorSection from './sections/ProfileEditorSection';
import HeaderSection from './sections/HeaderSection';
import type { ExtractedResumeData } from '@/lib/shared/types';
import { ProfileValidationResult } from '@/lib/client/profileValidation';

interface ProfileTabProps {
  profileData: ExtractedResumeData;
  setProfileData: Dispatch<SetStateAction<ExtractedResumeData>>;
  validation: ProfileValidationResult;
  showValidationErrors: boolean;
  showValidationMessage: boolean;
  draftId: string | null;
  draftStatus: 'editing' | 'published';
  resumeInfo: { filename?: string; uploaded_at?: string } | null;
  uploading: boolean;
  extracting: boolean;
  uploadSuccess: boolean;
  uploadError: string;
  finalizing: boolean;
  saveSuccess: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDownload: () => void;
  handleFinalize: () => void;
}

export default function ProfileTab({
  profileData,
  setProfileData,
  validation,
  showValidationErrors,
  showValidationMessage,
  draftId,
  draftStatus,
  resumeInfo,
  uploading,
  extracting,
  uploadSuccess,
  uploadError,
  finalizing,
  saveSuccess,
  handleFileChange,
  handleDownload,
  handleFinalize,
}: ProfileTabProps) {
  const [importingGitHub, setImportingGitHub] = useState(false);

  // Handler for GitHub import completion - ONLY update projects and skills
  const handleGitHubImport = (projects: any[], skills: any[]) => {
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
        onImportingChange={setImportingGitHub}
        draftStatus={draftStatus}
      />

      {/* Profile Editor */}
      <ProfileEditorSection
        data={profileData}
        onChange={setProfileData}
        onSave={handleFinalize}
        isSaving={finalizing}
        canSave={validation.isValid}
        validation={showValidationErrors ? validation : undefined}
        disabled={uploading || extracting || importingGitHub}
        loadingMessage={uploading ? 'Uploading Resume...' : extracting ? 'Extracting Data...' : importingGitHub ? 'Importing from GitHub...' : undefined}
        loadingSubmessage={uploading ? 'Please wait while we upload your resume' : extracting ? 'AI is analyzing your resume and extracting information' : importingGitHub ? 'Fetching repositories and merging with your profile' : undefined}
        saveSuccess={saveSuccess}
        showValidationErrors={showValidationMessage}
      />
    </>
  );
}
