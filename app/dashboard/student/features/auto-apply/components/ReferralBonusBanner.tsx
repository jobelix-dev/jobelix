/**
 * Referral Bonus Banner - Shows referred users their pending bonus credits
 * 
 * Displayed above the Credits section for users who were referred.
 * Dismissible via localStorage flag.
 */

'use client';

import { useState, useSyncExternalStore, useCallback } from 'react';
import { Gift, X, Zap } from 'lucide-react';
import { useReferralStatus } from '../hooks/useReferralStatus';

const DISMISS_KEY = 'jobelix_referral_banner_dismissed';

// Use useSyncExternalStore for SSR-safe localStorage access
function useLocalStorageDismissed() {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
  }, []);
  
  const getSnapshot = useCallback(() => {
    return localStorage.getItem(DISMISS_KEY) === 'true';
  }, []);
  
  const getServerSnapshot = useCallback(() => {
    return true; // SSR: assume dismissed to prevent flash
  }, []);
  
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function ReferralBonusBanner() {
  const { status, loading } = useReferralStatus();
  const isDismissedFromStorage = useLocalStorageDismissed();
  const [localDismissed, setLocalDismissed] = useState(false);
  
  // Combined dismissed state: either from storage or locally dismissed this session
  const dismissed = isDismissedFromStorage || localDismissed;

  const handleDismiss = () => {
    setLocalDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
  };

  // Don't show if:
  // - Still loading
  // - User wasn't referred
  // - Referral already completed (they got their credits)
  // - User dismissed it
  if (loading || !status?.isReferred || status.status !== 'pending' || dismissed) {
    return null;
  }

  const referrerName = status.referrerFirstName;
  const credits = status.bonusCredits ?? 50;

  return (
    <div className="max-w-2xl mx-auto px-1 sm:px-0">
      <div className="relative bg-gradient-to-r from-success/10 to-primary/10 border border-success/30 rounded-xl p-4 shadow-sm">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-surface/50 rounded transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4 text-muted" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="p-2 bg-success/20 rounded-lg flex-shrink-0">
            <Gift className="w-5 h-5 text-success" />
          </div>
          
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-default">
              You have {credits} bonus credits waiting!
            </h4>
            <p className="text-xs text-muted mt-1">
              {referrerName 
                ? `${referrerName} invited you to Jobelix. `
                : 'You were invited to Jobelix. '}
              Run the bot to claim your bonus credits.
            </p>
            
            <div className="flex items-center gap-2 mt-2">
              <Zap className="w-3 h-3 text-warning" />
              <span className="text-xs text-warning font-medium">
                Credits are added after your first bot run
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
