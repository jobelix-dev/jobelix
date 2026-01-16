/**
 * Auto Apply Tab - Bot Control and Launch
 * 
 * Dedicated tab for managing credits and launching the bot
 */

'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import BotControlSection from '../job-preferences/sections/BotControlSection';
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

  // Handlers
  const handleBuyCredits = async () => {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'credits_1000' }),
    });

    const data = await response.json();
    
    // Log error details for debugging
    if (!response.ok) {
      console.error('Stripe checkout error:', {
        status: response.status,
        error: data.error,
        details: data
      });
    }

    if (response.ok && data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Failed to create checkout session');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Auto Apply
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Launch the LinkedIn Auto-Apply bot to automatically apply to jobs using your credits. <br />
          Don't forget to log in!
        </p>
      </div>

      {/* Blocking Message if requirements not met */}
      {isLoading ? (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-500 dark:text-zinc-400">Checking requirements...</div>
          </div>
        </div>
      ) : isBlocked ? (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              {!profilePublished && !preferences.preferencesComplete
                ? 'Please publish your profile and save your job preferences first.'
                : !profilePublished
                ? 'Please publish your profile in the Profile tab first.'
                : 'Please save your job preferences in the Job Preferences tab first.'}
            </div>
          </div>
        </div>
      ) : (
        /* Bot Control Section - only show when requirements are met */
        <div className="max-w-2xl mx-auto">
          <BotControlSection
            credits={{
              balance: credits.credits?.balance || 0,
              loading: credits.loading,
              claiming: credits.claiming,
              refreshing: credits.refreshing,
              error: credits.error,
              onClaim: credits.claimCredits,
              onBuy: handleBuyCredits,
              onRefresh: credits.refresh,
            }}
            botLauncher={{
              canLaunch,
              launching: botLauncher.launching,
              launchError: botLauncher.error,
              hasCredits,
              checking: preferences.checking,
              onLaunch: botLauncher.launchBot,
            }}
          />
        </div>
      )}
    </div>
  );
}
