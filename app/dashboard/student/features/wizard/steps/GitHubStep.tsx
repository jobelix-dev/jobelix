/**
 * GitHubStep Component
 * 
 * Step 1 of the setup wizard (optional).
 * Connect GitHub account and import projects/skills.
 * Shows imported data for review.
 */

'use client';

import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { Github, RefreshCw, Check, AlertCircle, Loader2, Code2, Wrench } from 'lucide-react';
import { useGitHubConnection } from '../../../hooks';
import StepHeader from '../components/StepHeader';
import StickyActionBar from '../components/StickyActionBar';
import type { StepNavProps } from '../components/StepHeader';
import type { ExtractedResumeData, ProjectEntry, SkillEntry } from '@/lib/shared/types';

interface GitHubStepProps extends StepNavProps {
  profileData: ExtractedResumeData;
  setProfileData: Dispatch<SetStateAction<ExtractedResumeData>>;
  importingGitHub: boolean;
  githubImportProgress?: {
    step: string;
    progress: number;
    reposProcessed: number;
    reposTotal: number;
    batchRepos: string[];
    complete?: boolean;
    updatedAt: string;
  } | null;
  onGitHubImport: (
    currentProjects: ProjectEntry[],
    currentSkills: SkillEntry[],
    onComplete?: (projects: ProjectEntry[], skills: SkillEntry[]) => void
  ) => Promise<{ projects: ProjectEntry[]; skills: SkillEntry[] } | null>;
}

export default function GitHubStep({
  profileData,
  setProfileData,
  importingGitHub,
  githubImportProgress,
  onGitHubImport,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  stepsDisabled,
}: GitHubStepProps) {
  const [importDone, setImportDone] = useState(false);

  const handleImportComplete = useCallback((projects: ProjectEntry[], skills: SkillEntry[]) => {
    setProfileData((prev) => ({
      ...prev,
      projects,
      skills,
    }));
    setImportDone(true);
  }, [setProfileData]);

  const handleImport = useCallback(async () => {
    setImportDone(false);
    await onGitHubImport(profileData.projects, profileData.skills, handleImportComplete);
  }, [onGitHubImport, profileData.projects, profileData.skills, handleImportComplete]);

  // Auto-import projects immediately after GitHub is connected
  const handleConnected = useCallback(() => {
    // Small delay to let the status UI update before showing the import spinner
    setTimeout(() => {
      onGitHubImport(profileData.projects, profileData.skills, handleImportComplete);
    }, 300);
  }, [onGitHubImport, profileData.projects, profileData.skills, handleImportComplete]);

  const { status, loading: statusLoading, error: connectionError, connect, disconnect } = useGitHubConnection({
    onConnected: handleConnected,
  });

  const handleChangeAccount = async () => {
    const success = await disconnect();
    if (success) {
      setTimeout(() => connect(), 500);
    }
  };

  const isConnected = status?.connected;

  return (
    <div className="space-y-6">
      {/* Header with title only (nav is in the sticky bar) */}
      <StepHeader
        title="Import from GitHub"
        subtitle="Connect your GitHub to automatically import your projects and skills"
        hideNext
      />

      {/* Connection card */}
      <div className="bg-surface rounded-2xl border border-border/30 overflow-hidden">
        {statusLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted" />
          </div>
        ) : !isConnected ? (
          /* Not connected state */
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-background flex items-center justify-center mx-auto mb-4">
              <Github className="w-8 h-8 text-default" />
            </div>
            <h3 className="text-lg font-semibold text-default mb-2">Connect Your Account</h3>
            <p className="text-sm text-muted mb-6 max-w-sm mx-auto">
              We&apos;ll analyze your repositories to extract project descriptions and technical skills
            </p>
            <button
              onClick={connect}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#24292e] hover:bg-[#1b1f23] 
                text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              <Github className="w-5 h-5" />
              Connect GitHub
            </button>
          </div>
        ) : (
          /* Connected state */
          <div>
            {/* Connected header */}
            <div className="flex items-center justify-between p-4 bg-primary-subtle/15 border-b border-border/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-default">
                    Connected as <span className="text-primary">@{status.metadata?.username}</span>
                  </p>
                  <p className="text-xs text-muted">GitHub account linked</p>
                </div>
              </div>
              <button
                onClick={handleChangeAccount}
                disabled={importingGitHub}
                className="text-xs text-muted hover:text-default transition-colors cursor-pointer disabled:opacity-50"
              >
                Change
              </button>
            </div>

            {/* Import section */}
            <div className="p-6">
              {importingGitHub ? (
                /* Import in progress */
                <div className="text-center py-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-sm font-medium text-default mb-1">
                    Analyzing your repositories...
                  </p>
                  {githubImportProgress && (
                    <>
                      <p className="text-xs text-muted mb-3">
                        {githubImportProgress.step}
                        {githubImportProgress.reposTotal > 0 && (
                          <> ({githubImportProgress.reposProcessed}/{githubImportProgress.reposTotal} repos)</>
                        )}
                      </p>
                      <div className="w-full max-w-xs mx-auto">
                        <div className="h-2 rounded-full bg-primary-subtle/60 overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${githubImportProgress.progress}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : importDone ? (
                /* Import complete — show results */
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-semibold">Import complete!</span>
                  </div>
                  
                  {/* Imported projects summary */}
                  {profileData.projects.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Code2 className="w-4 h-4 text-muted" />
                        <span className="text-sm font-medium text-default">
                          {profileData.projects.length} Projects
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {profileData.projects.slice(0, 8).map((p, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded-lg bg-background border border-border/30 text-default">
                            {p.project_name || 'Untitled'}
                          </span>
                        ))}
                        {profileData.projects.length > 8 && (
                          <span className="text-xs px-2 py-1 text-muted">
                            +{profileData.projects.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Imported skills summary */}
                  {profileData.skills.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench className="w-4 h-4 text-muted" />
                        <span className="text-sm font-medium text-default">
                          {profileData.skills.length} Skills
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {profileData.skills.slice(0, 12).map((s, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded-lg bg-primary-subtle/40 text-primary font-medium">
                            {s.skill_name}
                          </span>
                        ))}
                        {profileData.skills.length > 12 && (
                          <span className="text-xs px-2 py-1 text-muted">
                            +{profileData.skills.length - 12} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Re-import button */}
                  <button
                    onClick={handleImport}
                    className="text-xs text-muted hover:text-primary transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 inline mr-1" />
                    Re-import
                  </button>
                </div>
              ) : (
                /* Ready to import */
                <div className="text-center py-2">
                  <p className="text-sm text-muted mb-4">
                    AI will analyze your repos to extract project descriptions and skills
                  </p>
                  <button
                    onClick={handleImport}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover 
                      text-white font-medium text-sm rounded-lg transition-colors cursor-pointer"
                  >
                    <Github className="w-4 h-4" />
                    Import Projects
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {connectionError && (
        <div className="flex items-start gap-2.5 p-3 bg-error-subtle/20 border border-error/30 rounded-xl">
          <AlertCircle className="w-4 h-4 text-error mt-0.5 flex-shrink-0" />
          <p className="text-sm text-error">{connectionError}</p>
        </div>
      )}

      {/* Info note */}
      <div className="text-center">
        <p className="text-xs text-muted">
          This step is optional. Your GitHub data will be merged with your existing profile.
        </p>
      </div>

      {/* Bottom spacer so sticky bar doesn't cover content */}
      <div className="h-20" aria-hidden="true" />

      {/* Sticky bottom action bar */}
      <StickyActionBar
        onBack={onBack}
        onAction={onNext ?? (() => {})}
        actionLabel={nextLabel}
        actionDisabled={nextDisabled}
        allDisabled={stepsDisabled}
      />
    </div>
  );
}
