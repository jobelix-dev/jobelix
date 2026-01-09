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
import { api } from '@/lib/api';
import { ProfileEditor } from '../features/profile';
import { AIAssistant } from '../features/ai-assistant';
import { ResumeSection } from '../features/resume';
import type { ExtractedResumeData } from '@/lib/types';
import { ProfileValidationResult } from '@/lib/profileValidation';

interface ProfileTabProps {
  profileData: ExtractedResumeData;
  setProfileData: (data: ExtractedResumeData) => void;
  validation: ProfileValidationResult;
  showValidationErrors: boolean;
  showValidationMessage: boolean;
  draftId: string | null;
  showAIAssistant: boolean;
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
  showAIAssistant,
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

      {/* Grid layout: ProfileEditor (main) + AIAssistant (sidebar when active) */}
      <div className={`grid grid-cols-1 ${showAIAssistant ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
        {/* Main Profile Editor */}
        <div className={showAIAssistant ? 'lg:col-span-2' : 'lg:col-span-1'}>
          <ProfileEditor
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
        </div>

        {/* AI Assistant - optional sidebar */}
        {showAIAssistant && draftId && (
          <div className="lg:col-span-1">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                🤖 AI Assistant Active
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Your resume has been analyzed. Chat with AI to validate and complete your profile.
              </p>
            </div>
            <AIAssistant
              draftId={draftId}
              currentData={profileData}
              onUpdate={setProfileData}
              onFinalize={handleFinalize}
            />
          </div>
        )}
      </div>
    </>
  );
}
