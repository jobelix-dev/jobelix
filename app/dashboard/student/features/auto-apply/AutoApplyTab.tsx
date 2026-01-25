/**
 * Auto Apply Tab - Bot Control and Launch
 * 
 * Dedicated tab for managing credits and launching the LinkedIn Auto-Apply bot.
 * Includes comprehensive documentation on how the bot works.
 */

'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Search, FileText, ClipboardCheck, Zap } from 'lucide-react';
import CreditsSection from './components/CreditsSection';
import LaunchButton from './components/LaunchButton';
import BotStatusCard from './components/BotStatusCard';
import { useCredits, usePreferences, useBotLauncher } from '../job-preferences/hooks';
import { useBotStatus } from './hooks/useBotStatus';

export default function AutoApplyTab() {
  const [profilePublished, setProfilePublished] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);

  // Custom hooks for separated concerns
  const credits = useCredits();
  const preferences = usePreferences();
  const botLauncher = useBotLauncher();
  const botStatus = useBotStatus();

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
      } catch (error) {
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

  return (
    <div className="space-y-10">
      {/* Instructions Modal - Can be reopened */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-default">How to Use the Bot</h3>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-muted hover:text-default transition-colors"
              >
                <AlertCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <p className="text-sm text-muted">
                Please read these important instructions to ensure the bot runs smoothly:
              </p>

              {/* Instruction 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-default mb-1">Manual LinkedIn Login Required</h4>
                  <p className="text-sm text-muted">
                    The bot will open a Chromium browser window. You'll need to log into LinkedIn manually each time. 
                    <strong className="text-default"> Your credentials are never stored or transmitted</strong> — this ensures your account security.
                  </p>
                </div>
              </div>

              {/* Instruction 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <h4 className="font-medium text-default mb-1">Don't Touch the Browser</h4>
                  <p className="text-sm text-muted">
                    Once logged in, <strong className="text-default">do not click, scroll, or interact</strong> with the browser window. 
                    You can minimize it or switch to other apps, but any interaction will disrupt the bot's automation.
                  </p>
                </div>
              </div>

              {/* Instruction 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-danger/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-danger" />
                </div>
                <div>
                  <h4 className="font-medium text-default mb-1">How to Stop the Bot</h4>
                  <p className="text-sm text-muted">
                    You can stop the bot at any time by either:
                  </p>
                  <ul className="text-sm text-muted mt-2 space-y-1 list-disc list-inside ml-2">
                    <li>Clicking the <strong className="text-default">"Stop Bot"</strong> button in this app <span className="text-muted">(may take up to 15 seconds to close)</span>, or</li>
                    <li>Closing the Chromium browser window</li>
                  </ul>
                </div>
              </div>

              {/* Note */}
              <div className="p-4 bg-info-subtle/10 rounded-lg border border-info-subtle">
                <p className="text-xs text-muted">
                  <strong className="text-default">Tip:</strong> The bot will show live progress updates in the Auto Apply tab. 
                  You can monitor applications in real-time without touching the browser.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-border">
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
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-default">
          Auto Apply
        </h2>
        <p className="text-sm text-muted mt-1">
          Automatically apply to LinkedIn jobs matching your preferences.
        </p>
      </div>

      {/* How It Works */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-background rounded-xl p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-default mb-4">How It Works</h3>
          <div className="grid sm:grid-cols-2 gap-4">
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
      <div className="max-w-2xl mx-auto">
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
      <div className="max-w-2xl mx-auto">
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
            {/* Show status card if session exists (with launch button when completed), otherwise show launch button */}
            {botStatus.session ? (
              <BotStatusCard 
                session={botStatus.session}
                historicalTotals={botStatus.historicalTotals}
                onStop={botStatus.stopBot}
                onLaunch={canLaunch ? botLauncher.launchBot : undefined}
                onShowInstructions={() => setShowInstructions(true)}
              />
            ) : (
              <LaunchButton
                canLaunch={canLaunch}
                launching={botLauncher.launching}
                launchError={botLauncher.error}
                hasCredits={hasCredits}
                onLaunch={botLauncher.launchBot}
              />
            )}
          </>
        )}
      </div>

      {/* Beta Disclaimer */}
      <div className="max-w-2xl mx-auto">
        <p className="text-xs text-muted leading-relaxed">
          <strong className="text-warning">Beta Notice:</strong> This auto-apply bot is currently in beta and provided on an experimental basis. Use is at your own discretion. We are not responsible for any account restrictions, suspensions, or other consequences resulting from its use.
        </p>
      </div>
    </div>
  );
}
