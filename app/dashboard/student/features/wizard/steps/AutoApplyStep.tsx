/**
 * AutoApplyStep Component
 * 
 * Step 4 of the wizard — the "home" screen for returning users.
 * Shows bot launch controls, a Credits button (opens overlay modal),
 * and a beta disclaimer.
 * 
 * Navigation: Back-only sticky bar (last step, no Continue).
 */

'use client';

import { AlertCircle, Zap, Gift } from 'lucide-react';
import LaunchSection from '../../auto-apply/components/LaunchSection';
import { usePreferences } from '../../job-preferences/hooks';
import { useBot } from '../../auto-apply/hooks';
import { useBrowserStatus } from '../../auto-apply/hooks/useBrowserStatus';
import { useCreditsModal, CreditsModal } from '@/app/components/CreditsIndicator';
import StepHeader from '../components/StepHeader';
import StickyActionBar from '../components/StickyActionBar';
import type { StepNavProps } from '../components/StepHeader';

interface AutoApplyStepProps extends StepNavProps {
  /** Whether the profile is published (from wizard state) */
  profilePublished: boolean;
  /** Whether preferences are saved (from wizard state) */
  preferencesComplete: boolean;
}

export default function AutoApplyStep({
  profilePublished,
  preferencesComplete,
  onBack,
  stepsDisabled,
}: AutoApplyStepProps) {
  const { credits, modalOpen, openModal, closeModal, handleBuyCredits } = useCreditsModal();
  const preferences = usePreferences();
  const bot = useBot();
  const browser = useBrowserStatus();

  const isLoading = preferences.checking;
  const balance = credits.credits?.balance ?? 0;
  const hasCredits = balance > 0;
  const canClaim = credits.claimStatus?.can_claim && !credits.claimStatus?.claimed_today;
  const canLaunch = hasCredits && preferencesComplete && profilePublished && browser.installed;
  const isBlocked = !profilePublished || !preferencesComplete;

  return (
    <div className="space-y-8">
      {/* Header — title only, no nav buttons */}
      <StepHeader
        title="Auto Apply"
        subtitle="Automatically apply to LinkedIn jobs matching your preferences."
        showBack={false}
        hideNext
      />

      {/* Credits button — prominent card that opens the credits modal */}
      <button
        type="button"
        onClick={openModal}
        className="w-full flex items-center justify-between gap-4 p-4 
          bg-primary-subtle/15 hover:bg-primary-subtle/25 
          border border-primary/20 hover:border-primary/40 
          rounded-xl transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-default">
              {balance.toLocaleString()} credits
            </p>
            <p className="text-xs text-muted">
              {canClaim ? 'Daily credits available!' : 'Manage credits & referrals'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canClaim && (
            <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-success bg-success/10 rounded-md">
              <Gift className="w-3 h-3" />
              Claim
            </span>
          )}
          <span className="text-xs font-medium text-primary group-hover:text-primary-hover transition-colors">
            Open
          </span>
        </div>
      </button>

      {/* Launch Section — State Machine Driven */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-muted">Checking requirements...</div>
        </div>
      ) : isBlocked ? (
        <BlockedMessage
          profilePublished={profilePublished}
          preferencesComplete={preferencesComplete}
        />
      ) : (
        <LaunchSection
          browserChecking={browser.checking}
          browserInstalled={browser.installed}
          browserInstalling={browser.installing}
          browserProgress={browser.progress}
          browserError={browser.error}
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

      {/* Beta Disclaimer */}
      <p className="text-xs text-muted leading-relaxed">
        <strong className="text-warning">Beta Notice:</strong> This auto-apply bot is
        currently in beta and provided on an experimental basis. Use is at your own
        discretion. We are not responsible for any account restrictions, suspensions, or
        other consequences resulting from its use.
      </p>

      {/* Bottom spacer so sticky bar doesn't cover content */}
      <div className="h-20" aria-hidden="true" />

      {/* Sticky bottom action bar — Back only (last step, no Continue) */}
      <StickyActionBar
        onBack={onBack}
        allDisabled={stepsDisabled}
      />

      {/* Credits overlay modal */}
      {modalOpen && (
        <CreditsModal
          credits={credits}
          onBuyCredits={handleBuyCredits}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

interface BlockedMessageProps {
  profilePublished: boolean;
  preferencesComplete: boolean;
}

function BlockedMessage({ profilePublished, preferencesComplete }: BlockedMessageProps) {
  let message: string;
  if (!profilePublished && !preferencesComplete) {
    message = 'Go back to the Profile and Preferences steps to complete your setup.';
  } else if (!profilePublished) {
    message = 'Go back to the Profile step and publish your profile first.';
  } else {
    message = 'Go back to the Preferences step and save your job preferences first.';
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-warning-subtle/20 border border-warning rounded-lg">
      <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
      <div className="text-sm text-warning">{message}</div>
    </div>
  );
}
