/**
 * HeaderSection Component
 * 
 * Merged component handling both resume upload and GitHub integration.
 * Displays header with options to auto-fill profile data.
 */

'use client';

import React, { useEffect } from 'react';
import { Github, AlertCircle, CheckCircle, RefreshCw, CloudUpload, ArrowDown } from 'lucide-react';
import StatusAlert from '@/app/components/StatusAlert';
import { useGitHubConnection, useGitHubImport } from '../../../hooks';
import { ProjectEntry, SkillEntry } from '@/lib/shared/types';
import { useSearchParams } from 'next/navigation';

interface HeaderSectionProps {
  // Resume props
  resumeInfo: { filename?: string; uploaded_at?: string } | null;
  uploading: boolean;
  extracting: boolean;
  uploadSuccess: boolean;
  uploadError: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: () => void;
  
  // GitHub props
  currentProjects: ProjectEntry[];
  currentSkills: SkillEntry[];
  onGitHubImportComplete: (projects: ProjectEntry[], skills: SkillEntry[]) => void;
  onImportingChange?: (importing: boolean) => void;
  
  // Draft status
  draftStatus?: 'editing' | 'published';
}

export default function HeaderSection({
  resumeInfo,
  uploading,
  extracting,
  uploadSuccess,
  uploadError,
  onFileChange,
  onDownload,
  currentProjects,
  currentSkills,
  onGitHubImportComplete,
  onImportingChange,
  draftStatus = 'editing',
}: HeaderSectionProps) {
  const searchParams = useSearchParams();
  const { status, loading: statusLoading, error: connectionError, connect, disconnect } = useGitHubConnection();
  const { importGitHubData, importing, error: importError, success: importSuccess } = useGitHubImport();

  const isResumeDisabled = uploading || extracting || importing;
  const isGitHubDisabled = uploading || extracting;

  // Notify parent when importing state changes
  React.useEffect(() => {
    onImportingChange?.(importing);
  }, [importing, onImportingChange]);

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'github-oauth-success') {
        // GitHub connected successfully via popup, trigger auto-sync
        setTimeout(() => {
          handleGitHubImport();
        }, 1000);
      } else if (event.data.type === 'github-oauth-error') {
        console.error('GitHub OAuth error:', event.data.error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentProjects, currentSkills]);

  // Auto-sync after first GitHub connection (fallback for non-popup flow)
  useEffect(() => {
    const shouldAutoSync = searchParams.get('auto_sync') === 'true';
    const isConnected = status?.connected;
    
    if (shouldAutoSync && isConnected && !statusLoading && !importing) {
      // Clear the URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('auto_sync');
      url.searchParams.delete('github_connected');
      window.history.replaceState({}, '', url.toString());
      
      // Trigger auto-sync
      handleGitHubImport();
    }
  }, [searchParams, status?.connected, statusLoading, importing]);

  const handleGitHubImport = async () => {
    const result = await importGitHubData(currentProjects, currentSkills);
    if (result) {
      onGitHubImportComplete(result.projects, result.skills);
    }
  };

  const handleChangeAccount = async () => {
    const success = await disconnect();
    if (success) {
      setTimeout(() => {
        connect();
      }, 500);
    }
  };

  return (
    <section className="max-w-2xl mx-auto">
      {/* Page Header with Status */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Complete & Publish Your Profile</h1>
        
        {/* Draft Status Indicator */}
        {draftStatus === 'editing' && (
          <button
            onClick={() => {
              const publishButton = document.getElementById('publish-profile-button');
              publishButton?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
          >
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Unpublished Changes
            </span>
            <ArrowDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </button>
        )}
        
        {draftStatus === 'published' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <CloudUpload className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Published
            </span>
          </div>
        )}
      </div>
      
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Resume Upload Card */}
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-lg">📄</span>
            Upload PDF Resume
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
            Auto-fill your profile with AI assistance
          </p>
          <div className="relative">
            <input
              type="file"
              accept="application/pdf"
              onChange={onFileChange}
              disabled={isResumeDisabled}
              id="resume-upload"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            />
            <button
              className={`w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors ${
                isResumeDisabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isResumeDisabled}
            >
              {uploading ? 'Uploading...' : extracting ? 'Extracting...' : 'Choose PDF File'}
            </button>
          </div>
        </div>

        {/* GitHub Sync Card */}
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Github className="w-5 h-5" />
            GitHub Sync
          </h3>
          {!statusLoading && (
            <>
              {status?.connected ? (
                <>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    Logged in as <span className="font-medium text-zinc-900 dark:text-zinc-100">@{status.metadata?.username || 'connected'}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGitHubImport}
                      disabled={importing || isGitHubDisabled}
                      className={`flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors ${
                        importing || isGitHubDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {importing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                          Syncing...
                        </>
                      ) : (
                        'Sync Projects'
                      )}
                    </button>
                    <button
                      onClick={handleChangeAccount}
                      disabled={importing || isGitHubDisabled}
                      className={`px-3 py-2.5 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
                        importing || isGitHubDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title="Change GitHub account"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    Auto-fill your projects and skills from GitHub
                  </p>
                  <button
                    onClick={connect}
                    disabled={isGitHubDisabled}
                    className={`w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors ${
                      isGitHubDisabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Github className="w-4 h-4 mr-2" />
                    Connect GitHub
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {uploadError && (
        <StatusAlert variant="error">{uploadError}</StatusAlert>
      )}

      {(connectionError || importError) && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">
            {connectionError || importError}
          </p>
        </div>
      )}

      {/* Compact Resume Info */}
      {resumeInfo && (
        <div className="flex items-center gap-4 p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/10">
          <div className="flex-1">
            <p className="font-medium text-sm">{resumeInfo.filename}</p>
            <p className="text-xs text-zinc-500">
              Uploaded {resumeInfo.uploaded_at ? new Date(resumeInfo.uploaded_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <button
            onClick={onDownload}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
          >
            Download
          </button>
        </div>
      )}

    </section>
  );
}
