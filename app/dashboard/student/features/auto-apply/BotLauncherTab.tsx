/**
 * Auto Apply Tab - Bot Control and Launch
 * 
 * Dedicated tab for managing credits and launching the bot
 */

'use client';

import BotControlSection from '../job-preferences/sections/BotControlSection';
import { useCredits, usePreferences, useBotLauncher } from '../job-preferences/hooks';

export default function BotLauncherTab() {
  // Custom hooks for separated concerns
  const credits = useCredits();
  const preferences = usePreferences();
  const botLauncher = useBotLauncher();

  // Derived state
  const canLaunch = !!(credits.credits && credits.credits.balance > 0 && preferences.preferencesComplete);
  const hasCredits = credits.credits ? credits.credits.balance > 0 : false;

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
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Auto Apply
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Launch the LinkedIn Auto-Apply bot to automatically apply to jobs
        </p>
      </div>

      {/* Bot Control Section */}
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
  );
}
