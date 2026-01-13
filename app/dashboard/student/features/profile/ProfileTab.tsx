/**
 * Profile Tab Content
 * 
 * Contains the existing profile functionality:
 * - Resume upload
 * - Profile editor
 * - AI assistant
 */

'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import ProfileEditorSection from './sections/ProfileEditorSection';
import ResumeSection from './sections/ResumeSection';
import type { ExtractedResumeData } from '@/lib/shared/types';
import { ProfileValidationResult } from '@/lib/client/profileValidation';

interface ProfileTabProps {
  profileData: ExtractedResumeData;
  setProfileData: (data: ExtractedResumeData) => void;
  validation: ProfileValidationResult;
  showValidationErrors: boolean;
  showValidationMessage: boolean;
  draftId: string | null;
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
  return (
    <>
      {/* Resume Upload Section */}
      <ResumeSection
        resumeInfo={resumeInfo}
        uploading={uploading}
        extracting={extracting}
        uploadSuccess={uploadSuccess}
        uploadError={uploadError}
        onFileChange={handleFileChange}
        onDownload={handleDownload}
      />

      {/* Profile Editor */}
      <ProfileEditorSection
        data={profileData}
        onChange={setProfileData}
        onSave={handleFinalize}
        isSaving={finalizing}
        canSave={validation.isValid}
        validation={showValidationErrors ? validation : undefined}
        disabled={uploading || extracting}
        loadingMessage={uploading ? 'Uploading Resume...' : extracting ? 'Extracting Data...' : undefined}
        loadingSubmessage={uploading ? 'Please wait while we upload your resume' : extracting ? 'AI is analyzing your resume and extracting information' : undefined}
        saveSuccess={saveSuccess}
        showValidationErrors={showValidationMessage}
      />
    </>
  );
}
