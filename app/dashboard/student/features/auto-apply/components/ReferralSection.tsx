/**
 * Referral Section - Share referral link and view referrals
 * 
 * Simplified UI:
 * - Link with small copy icon (click link or icon to copy)
 * - Value proposition
 * - Stats (if any referrals)
 * - Referral list (if any referrals)
 */

'use client';

import { useState } from 'react';
import { Users, Copy, Check } from 'lucide-react';
import { useReferral } from '../hooks/useReferral';
import { getAppUrl } from '@/lib/client/config';
import ReferralList from './ReferralList';

export default function ReferralSection() {
  const { stats, referrals, loading, error } = useReferral();
  const [copied, setCopied] = useState(false);

  // Always use the configured app URL (production), not window.location
  const baseUrl = getAppUrl();
  const referralLink = stats?.code 
    ? `${baseUrl}/signup?ref=${stats.code}`
    : '';

  const handleCopy = async () => {
    if (!referralLink) return;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-background rounded-xl p-4 shadow-sm">
        <div className="text-sm text-muted text-center py-4">Loading referral data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background rounded-xl p-4 shadow-sm">
        <div className="text-sm text-error text-center py-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-xl p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold text-default">Invite Friends</h3>
        <Users className="w-5 h-5 text-primary" />
      </div>

      {/* Value Proposition */}
      <div className="text-sm text-muted">
        <p>
          Earn <span className="font-medium text-default">200 credits</span> for each friend who uses the bot.
          They get <span className="font-medium text-default">50 bonus credits</span> too.
        </p>
      </div>

      {/* Referral Link - clickable to copy */}
      <button
        onClick={handleCopy}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-surface hover:bg-primary-subtle/30 rounded-lg border border-border transition-colors text-left group"
        title="Click to copy"
      >
        <span className="text-sm text-muted flex-1 truncate font-mono">
          {referralLink || 'Loading...'}
        </span>
        <span className="flex-shrink-0 text-muted group-hover:text-primary transition-colors">
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </span>
      </button>
      
      {/* Copied feedback */}
      {copied && (
        <p className="text-xs text-success text-center">Copied to clipboard!</p>
      )}

      {/* Summary Stats (only if there are referrals) */}
      {(stats?.totalReferrals ?? 0) > 0 && (
        <div className="flex items-center justify-between text-sm pt-2">
          <div className="flex items-center gap-4">
            <span className="text-muted">
              <span className="font-medium text-default">{stats?.completedReferrals || 0}</span> completed
            </span>
            {(stats?.pendingReferrals ?? 0) > 0 && (
              <span className="text-muted">
                <span className="font-medium text-warning">{stats?.pendingReferrals}</span> pending
              </span>
            )}
          </div>
          <span className="text-success font-medium">
            +{stats?.totalCreditsEarned || 0} credits
          </span>
        </div>
      )}

      {/* Referrals List */}
      {referrals.length > 0 && (
        <ReferralList referrals={referrals} />
      )}
    </div>
  );
}
