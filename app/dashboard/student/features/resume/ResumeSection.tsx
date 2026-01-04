/**
 * ResumeSection Component
 * Handles resume upload, display, and status messages
 */

import React from 'react';
import StatusAlert from '@/app/components/StatusAlert';

interface ResumeSectionProps {
  resumeInfo: { filename?: string; uploaded_at?: string } | null;
  uploading: boolean;
  extracting: boolean;
  uploadSuccess: boolean;
  uploadError: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: () => void;
}

export default function ResumeSection({
  resumeInfo,
  uploading,
  extracting,
  uploadSuccess,
  uploadError,
  onFileChange,
  onDownload,
}: ResumeSectionProps) {
  return (
    <section className="max-w-2xl mx-auto">
      {/* Page Header */}
      <h1 className="text-2xl font-bold mb-2">Complete Your Profile</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-6 flex items-center gap-2 flex-wrap">
        Fill in your information manually below, or
        <span className="relative inline-block">
          <input
            type="file"
            accept="application/pdf"
            onChange={onFileChange}
            disabled={uploading || extracting}
            id="resume-upload"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <label
            htmlFor="resume-upload"
            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap ${
              uploading || extracting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? 'uploading...' : 'upload your resume'}
          </label>
        </span>
        to auto-fill with AI assistance.
      </p>

      {/* Status Messages */}
      {uploadSuccess && (
        <StatusAlert variant="success">Resume uploaded successfully!</StatusAlert>
      )}
      {uploadError && (
        <StatusAlert variant="error">{uploadError}</StatusAlert>
      )}
      {extracting && (
        <StatusAlert variant="info">Extracting data from your resume...</StatusAlert>
      )}

      {/* Compact Resume Info */}
      {resumeInfo && (
        <div className="flex items-center gap-4 mt-4 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex-1">
            <p className="font-medium text-sm">{resumeInfo.filename}</p>
            <p className="text-xs text-zinc-500">
              Uploaded {resumeInfo.uploaded_at ? new Date(resumeInfo.uploaded_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <button
            onClick={onDownload}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors"
          >
            Download
          </button>
        </div>
      )}
    </section>
  );
}
