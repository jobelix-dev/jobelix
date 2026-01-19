/**
 * Auto Apply Tab - Bot Control and Launch
 * 
 * Dedicated tab for managing credits and launching the LinkedIn Auto-Apply bot.
 * Includes comprehensive documentation on how the bot works.
 */

'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Search, FileText, ClipboardCheck, Zap, Shield, MousePointer2Off, Clock } from 'lucide-react';
import CreditsSection from './components/CreditsSection';
import LaunchButton from './components/LaunchButton';
import { useCredits, usePreferences, useBotLauncher } from '../job-preferences/hooks';

export default function AutoApplyTab() {
  const [profilePublished, setProfilePublished] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  // Custom hooks for separated concerns
  const credits = useCredits();
  const preferences = usePreferences();
  const botLauncher = useBotLauncher();

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

      {/* Important Info */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-background rounded-xl p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-default mb-4">Important Information</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted">Linkedin credentials are not stored</p>
            </div>
            <div className="flex items-start gap-3">
              <MousePointer2Off className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted">Don't interact with Linkedin while bot is running</p>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted">Takes 1-3 min per application</p>
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
          <LaunchButton
            canLaunch={canLaunch}
            launching={botLauncher.launching}
            launchError={botLauncher.error}
            hasCredits={hasCredits}
            onLaunch={botLauncher.launchBot}
          />
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
