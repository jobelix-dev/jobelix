/**
 * Auto Apply Tab - Bot Control and Launch
 * 
 * Dedicated tab for managing credits and launching the LinkedIn Auto-Apply bot.
 * Includes comprehensive documentation on how the bot works.
 */

'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Search, FileText, ClipboardCheck, Zap, Info, LogIn, MousePointer2Off, StopCircle, X, Loader2, OctagonX } from 'lucide-react';
import CreditsSection from './components/CreditsSection';
import LaunchButton from './components/LaunchButton';
import BotStatusCard from './components/BotStatusCard';
import { BotLaunchStatus } from '@/lib/shared/types';
import { useSimulatedProgress } from '@/app/hooks';
import { InstallProgressBanner, SetupMessageBanner } from './components/BotLaunchStatusBanners';
import { usePreferences } from '../job-preferences/hooks';
import { useBot, useCredits } from './hooks';

export default function AutoApplyTab() {
  const [profilePublished, setProfilePublished] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);

  // Custom hooks for separated concerns
  const credits = useCredits();
  const preferences = usePreferences();
  const bot = useBot();

  // Wrapper for bot launch
  const handleLaunchBot = async () => {
    return await bot.launchBot();
  };

  // Clear launch status when bot session ends
  useEffect(() => {
    if (bot.session && ['completed', 'failed', 'stopped'].includes(bot.session.status)) {
      // Give user time to see the final status before clearing
      const timer = setTimeout(() => {
        // Don't clear if bot was relaunched
        if (bot.session && ['completed', 'failed', 'stopped'].includes(bot.session.status)) {
          // Keep session visible for summary, just clear launching state
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [bot.session]);

  // Check if profile is published
  useEffect(() => {
    const checkProfile = async () => {
      try {
        // Check the draft status to see if profile has been published
        const response = await fetch('/api/student/profile/draft');
        if (response.ok) {
          const data = await response.json();
          // Profile is published if draft status is 'published'
          setProfilePublished(data.draft?.status === 'published');
        } else {
          setProfilePublished(false);
        }
      } catch {
        setProfilePublished(false);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkProfile();
  }, []);

  // Derived state
  const canLaunch = !!(credits.credits && credits.credits.balance > 0 && preferences.preferencesComplete && profilePublished);
  const hasCredits = credits.credits ? credits.credits.balance > 0 : false;
  const isBlocked = !profilePublished || !preferences.preferencesComplete;
  const isLoading = checkingProfile || preferences.checking;

  // Handler for buying credits with plan selection
  const handleBuyCredits = async (plan: string) => {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Stripe checkout error:', {
        status: response.status,
        error: data.error,
        details: data
      });
      throw new Error(data.error || 'Failed to create checkout session');
    }

    if (data.url) {
      window.location.href = data.url;
    }
  };

  // Determine what to show based on bot state
  const isSessionActive = bot.session && (bot.session.status === 'starting' || bot.session.status === 'running');
  const isSessionEnded = bot.session && ['completed', 'failed', 'stopped'].includes(bot.session.status);
  const isLaunching = bot.launching || bot.launchStatus;

  return (
    <div className="space-y-10">
      {/* Instructions Modal - Can be reopened */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Info className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-default">How to Use the Bot</h3>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-2 hover:bg-primary-subtle rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-primary-subtle/10 p-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <LogIn className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-default">Log in to LinkedIn in the Chromium window.</p>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-warning-subtle/10 p-3">
                <div className="flex-shrink-0 w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center">
                  <MousePointer2Off className="w-4 h-4 text-warning" />
                </div>
                <p className="text-sm text-default">Don&apos;t click or scroll while the bot runs.</p>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-error-subtle/10 p-3">
                <div className="flex-shrink-0 w-8 h-8 bg-error/10 rounded-full flex items-center justify-center">
                  <StopCircle className="w-4 h-4 text-error" />
                </div>
                <p className="text-sm text-default">Stop with &quot;Stop Bot&quot; or close the window.</p>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-info-subtle/10 p-3">
                <div className="flex-shrink-0 w-8 h-8 bg-info/10 rounded-full flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4 text-info" />
                </div>
                <p className="text-sm text-default">Watch live progress here in Auto Apply.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowInstructions(false)}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="max-w-2xl mx-auto px-1 sm:px-0">
        <h2 className="text-xl sm:text-2xl font-bold text-default">
          Auto Apply
        </h2>
        <p className="text-sm text-muted mt-1">
          Automatically apply to LinkedIn jobs matching your preferences.
        </p>
      </div>

      {/* How It Works */}
      <div className="max-w-2xl mx-auto px-1 sm:px-0">
        <div className="bg-background rounded-xl p-3 sm:p-4 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-default mb-3 sm:mb-4">How It Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-start gap-3">
              <Search className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted">Finds jobs based on your preferences</p>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted">Generates tailored resumes & cover letters</p>
            </div>
            <div className="flex items-start gap-3">
              <ClipboardCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted">Fills forms using your profile data</p>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted">Applies while you focus elsewhere</p>
            </div>
          </div>
        </div>
      </div>

      {/* Credits Section - Always visible */}
      <div className="max-w-2xl mx-auto px-1 sm:px-0">
        <CreditsSection
          balance={credits.credits?.balance || 0}
          loading={credits.loading}
          claiming={credits.claiming}
          refreshing={credits.refreshing}
          error={credits.error}
          onClaim={credits.claimCredits}
          onBuy={handleBuyCredits}
          onRefresh={credits.refresh}
        />
      </div>

      {/* Blocking Message or Launch Button */}
      <div className="max-w-2xl mx-auto px-1 sm:px-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted">Checking requirements...</div>
          </div>
        ) : isBlocked ? (
          <div className="flex items-center gap-3 p-4 bg-warning-subtle/20 border border-warning rounded-lg">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
            <div className="text-sm text-warning">
              {!profilePublished && !preferences.preferencesComplete
                ? 'Please publish your profile and save your job preferences first.'
                : !profilePublished
                ? 'Please publish your profile in the Profile tab first.'
                : 'Please save your job preferences in the Job Preferences tab first.'}
            </div>
          </div>
        ) : (
          <>
            {/* Show status card when bot is launching OR session is active */}
            {(isLaunching && !isSessionActive) ? (
              // Bot is launching but session not yet running - show launch status with stop option
              <LaunchingStatusCard
                launchStatus={bot.launchStatus}
                onStop={bot.stopBot}
                stopping={bot.stopping}
              />
            ) : isSessionActive ? (
              <BotStatusCard 
                session={bot.session!}
                historicalTotals={bot.historicalTotals}
                onStop={bot.stopBot}
                onLaunch={canLaunch ? handleLaunchBot : undefined}
                onShowInstructions={() => setShowInstructions(true)}
                launchStatus={bot.launchStatus}
                botProcess={bot.botProcess}
                stopping={bot.stopping}
              />
            ) : isSessionEnded ? (
              /* Show recent session summary, then launch button */
              <div className="space-y-4">
                <BotStatusCard 
                  session={bot.session!}
                  historicalTotals={bot.historicalTotals}
                  onStop={bot.stopBot}
                  onLaunch={canLaunch ? handleLaunchBot : undefined}
                  onShowInstructions={() => setShowInstructions(true)}
                  launchStatus={bot.launchStatus}
                  botProcess={bot.botProcess}
                  stopping={bot.stopping}
                />
              </div>
            ) : (
              <LaunchButton
                canLaunch={canLaunch}
                launching={bot.launching}
                launchError={bot.error}
                hasCredits={hasCredits}
                onLaunch={handleLaunchBot}
                launchStatus={bot.launchStatus}
              />
            )}
          </>
        )}
      </div>

      {/* Beta Disclaimer */}
      <div className="max-w-2xl mx-auto px-1 sm:px-0">
        <p className="text-xs text-muted leading-relaxed">
          <strong className="text-warning">Beta Notice:</strong> This auto-apply bot is currently in beta and provided on an experimental basis. Use is at your own discretion. We are not responsible for any account restrictions, suspensions, or other consequences resulting from its use.
        </p>
      </div>
    </div>
  );
}

// --- Helper Components ---

interface LaunchingStatusCardProps {
  launchStatus: BotLaunchStatus | null;
  onStop: () => Promise<{ success: boolean; error?: string }>;
  stopping?: boolean;
}

/**
 * Card shown during bot launch phase before session is created
 */
function LaunchingStatusCard({ launchStatus, onStop, stopping }: LaunchingStatusCardProps) {
  const isInstalling = launchStatus?.stage === 'installing';
  const showSetupMessage = launchStatus && ['checking', 'launching'].includes(launchStatus.stage);

  const progressValue = useSimulatedProgress({
    isActive: isInstalling,
    realProgress: launchStatus?.progress,
  });

  const handleStop = async () => {
    await onStop();
  };

  return (
    <div className="bg-background rounded-xl p-4 shadow-sm space-y-4">
      {/* Header with Stop button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-default">Bot Session</h3>
        <button
          onClick={handleStop}
          disabled={stopping}
          className="flex items-center gap-2 px-4 py-2 bg-error hover:bg-error/90 text-white rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {stopping ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Stopping...
            </>
          ) : (
            <>
              <OctagonX className="w-4 h-4" />
              Stop Bot
            </>
          )}
        </button>
      </div>

      {/* Status banners */}
      {isInstalling && launchStatus && (
        <InstallProgressBanner progress={progressValue} />
      )}

      {!isInstalling && showSetupMessage && launchStatus && (
        <SetupMessageBanner message={launchStatus.message} stage={launchStatus.stage} />
      )}

      {/* Default launching state */}
      {!isInstalling && !showSetupMessage && (
        <div className="p-3 bg-primary-subtle/15 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-sm text-default">Starting bot...</span>
          </div>
        </div>
      )}
    </div>
  );
}
