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
import { useGitHubConnection } from '../../../hooks';
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
  onGitHubImport?: (currentProjects: ProjectEntry[], currentSkills: SkillEntry[], onComplete?: (projects: ProjectEntry[], skills: SkillEntry[]) => void) => Promise<any>;
  importingGitHub?: boolean;
  
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
  onGitHubImport,
  importingGitHub = false,
  draftStatus = 'editing',
}: HeaderSectionProps) {
  const searchParams = useSearchParams();
  const { status, loading: statusLoading, error: connectionError, connect, disconnect } = useGitHubConnection();

  const isResumeDisabled = uploading || extracting || importingGitHub;
  const isGitHubDisabled = uploading || extracting;

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== process.env.NEXT_PUBLIC_APP_URL) return;
      
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
    
    if (shouldAutoSync && isConnected && !statusLoading && !importingGitHub) {
      // Clear the URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('auto_sync');
      url.searchParams.delete('github_connected');
      window.history.replaceState({}, '', url.toString());
      
      // Trigger auto-sync
      handleGitHubImport();
    }
  }, [searchParams, status?.connected, statusLoading, importingGitHub]);

  const handleGitHubImport = async () => {
    if (onGitHubImport) {
      await onGitHubImport(currentProjects, currentSkills, onGitHubImportComplete);
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
    <section className="max-w-2xl mx-auto px-1 sm:px-0">
      {/* Page Header with Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Complete Your Profile</h1>
          <p className="text-sm text-muted mt-1">
            Set and save your profile to receive better employer matches <br className="hidden sm:block" /> and enable the LinkedIn Auto-Apply bot
          </p>
        </div>
        
        {/* Draft Status Indicator */}
        {draftStatus === 'editing' && (
          <button
            onClick={() => {
              const publishButton = document.getElementById('publish-profile-button');
              publishButton?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-warning-subtle/20 border border-warning hover:bg-warning-subtle transition-colors cursor-pointer flex-shrink-0 w-full sm:w-auto"
          >
            <span className="text-sm font-medium text-warning">
              Unsaved Changes
            </span>
            <ArrowDown className="w-4 h-4 text-warning" />
          </button>
        )}
        
        {draftStatus === 'published' && (
          <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-success-subtle/20 border border-success flex-shrink-0 w-full sm:w-auto">
            <CloudUpload className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-success">
              Saved
            </span>
          </div>
        )}
      </div>
      
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6 mb-4 sm:mb-6">
        {/* Resume Upload Card */}
        <div className="p-4 rounded-lg border border-primary-subtle bg-surface">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-lg">📄</span>
            Upload PDF Resume
          </h3>
          <p className="text-sm text-muted mb-3">
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
              className={`w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg bg-primary hover:bg-primary-hover text-white shadow-sm transition-colors ${
                isResumeDisabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isResumeDisabled}
            >
              {uploading ? 'Uploading...' : extracting ? 'Extracting...' : 'Choose PDF File'}
            </button>
          </div>
        </div>

        {/* GitHub Sync Card */}
        <div className="p-4 rounded-lg border border-primary-subtle bg-surface">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Github className="w-5 h-5" />
            GitHub Sync
          </h3>
          {!statusLoading && (
            <>
              {status?.connected ? (
                <>
                  <p className="text-sm text-muted mb-3">
                    Logged in as <span className="font-medium text-default">@{status.metadata?.username || 'connected'}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGitHubImport}
                      disabled={importingGitHub || isGitHubDisabled}
                      className={`flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg bg-primary hover:bg-primary-hover text-white shadow-sm transition-colors ${
                        importingGitHub || isGitHubDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {importingGitHub ? (
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
                      disabled={importingGitHub || isGitHubDisabled}
                      className={`px-3 py-2.5 text-sm font-medium rounded-lg border border-border hover:bg-primary-subtle transition-colors ${
                        importingGitHub || isGitHubDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title="Change GitHub account"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted mb-3">
                    Auto-fill your projects and skills from GitHub
                  </p>
                  <button
                    onClick={connect}
                    disabled={isGitHubDisabled}
                    className={`w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg bg-primary hover:bg-primary-hover text-white shadow-sm transition-colors ${
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

      {connectionError && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-error-subtle/20 border border-error rounded-lg">
          <AlertCircle className="w-4 h-4 text-error mt-0.5 flex-shrink-0" />
          <p className="text-sm text-error">
            {connectionError}
          </p>
        </div>
      )}

      {/* Compact Resume Info */}
      {resumeInfo && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg bg-primary-subtle/10">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{resumeInfo.filename}</p>
            <p className="text-xs text-muted">
              Uploaded {resumeInfo.uploaded_at ? new Date(resumeInfo.uploaded_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <button
            onClick={onDownload}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary hover:bg-primary-hover text-white transition-colors w-full sm:w-auto"
          >
            Download
          </button>
        </div>
      )}

    </section>
  );
}
