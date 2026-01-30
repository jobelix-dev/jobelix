/**
 * Auto Apply Tab - Bot Control Interface
 *
 * Clean UI driven by bot state machine:
 *   - IDLE: Show "Start Bot" button
 *   - LAUNCHING: Show progress + "Stop Bot" option
 *   - RUNNING: Show live status + "Stop Bot" button
 *   - STOPPING: Show "Stopping..." indicator
 *   - STOPPED/COMPLETED/FAILED: Show summary + "Start Bot" button
 */

'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Search, FileText, ClipboardCheck, Zap } from 'lucide-react';
import CreditsSection from './components/CreditsSection';
import LaunchSection from './components/LaunchSection';
import { usePreferences } from '../job-preferences/hooks';
import { useBot, useCredits } from './hooks';

export default function AutoApplyTab() {
  const [profilePublished, setProfilePublished] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  // Hooks
  const credits = useCredits();
  const preferences = usePreferences();
  const bot = useBot();

  // Check if profile is published on mount
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const response = await fetch('/api/student/profile/draft');
        if (response.ok) {
          const data = await response.json();
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
  const isLoading = checkingProfile || preferences.checking;
  const hasCredits = credits.credits ? credits.credits.balance > 0 : false;
  const canLaunch = hasCredits && preferences.preferencesComplete && profilePublished;
  const isBlocked = !profilePublished || !preferences.preferencesComplete;

  // Handler for buying credits
  const handleBuyCredits = async (plan: string) => {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Stripe checkout error:', data);
      throw new Error(data.error || 'Failed to create checkout session');
    }

    if (data.url) {
      window.location.href = data.url;
    }
  };

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="max-w-2xl mx-auto px-1 sm:px-0">
        <h2 className="text-xl sm:text-2xl font-bold text-default">Auto Apply</h2>
        <p className="text-sm text-muted mt-1">
          Automatically apply to LinkedIn jobs matching your preferences.
        </p>
      </div>

      {/* How It Works */}
      <div className="max-w-2xl mx-auto px-1 sm:px-0">
        <div className="bg-background rounded-xl p-3 sm:p-4 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-default mb-3 sm:mb-4">
            How It Works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Feature icon={Search} text="Finds jobs based on your preferences" />
            <Feature icon={FileText} text="Generates tailored resumes & cover letters" />
            <Feature icon={ClipboardCheck} text="Fills forms using your profile data" />
            <Feature icon={Zap} text="Applies while you focus elsewhere" />
          </div>
        </div>
      </div>

      {/* Credits Section */}
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

      {/* Launch Section - State Machine Driven */}
      <div className="max-w-2xl mx-auto px-1 sm:px-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted">Checking requirements...</div>
          </div>
        ) : isBlocked ? (
          <BlockedMessage
            profilePublished={profilePublished}
            preferencesComplete={preferences.preferencesComplete}
          />
        ) : (
          <LaunchSection
            botState={bot.botState}
            launchProgress={bot.launchProgress}
            sessionStats={bot.sessionStats}
            historicalTotals={bot.historicalTotals}
            currentActivity={bot.currentActivity}
            activityDetails={bot.activityDetails}
            botPid={bot.botPid}
            errorMessage={bot.errorMessage}
            canLaunch={canLaunch}
            hasCredits={hasCredits}
            onLaunch={bot.launchBot}
            onStop={bot.stopBot}
            onReset={bot.resetToIdle}
          />
        )}
      </div>

      {/* Beta Disclaimer */}
      <div className="max-w-2xl mx-auto px-1 sm:px-0">
        <p className="text-xs text-muted leading-relaxed">
          <strong className="text-warning">Beta Notice:</strong> This auto-apply bot is
          currently in beta and provided on an experimental basis. Use is at your own
          discretion. We are not responsible for any account restrictions, suspensions, or
          other consequences resulting from its use.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function Feature({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

interface BlockedMessageProps {
  profilePublished: boolean;
  preferencesComplete: boolean;
}

function BlockedMessage({ profilePublished, preferencesComplete }: BlockedMessageProps) {
  let message: string;
  if (!profilePublished && !preferencesComplete) {
    message = 'Please publish your profile and save your job preferences first.';
  } else if (!profilePublished) {
    message = 'Please publish your profile in the Profile tab first.';
  } else {
    message = 'Please save your job preferences in the Job Preferences tab first.';
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-warning-subtle/20 border border-warning rounded-lg">
      <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
      <div className="text-sm text-warning">{message}</div>
    </div>
  );
}
