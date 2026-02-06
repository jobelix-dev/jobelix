/**
 * Referral Section - Share referral link and view referrals
 */

'use client';

import { useState } from 'react';
import { Users, Copy, Check, Share2, Link } from 'lucide-react';
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

  const handleShare = async () => {
    if (!referralLink) return;

    const shareData = {
      title: 'Join Jobelix',
      text: 'I\'ve been using Jobelix to automate my job applications. Sign up with my link and we both get bonus credits!',
      url: referralLink,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to copy
        await handleCopy();
      }
    } catch (err) {
      // User cancelled share or error
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-background rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="text-sm text-muted text-center py-4">Loading referral data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="text-sm text-error text-center py-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-xl p-3 sm:p-4 shadow-sm space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold text-default">Invite Friends</h3>
        <Users className="w-5 h-5 text-primary" />
      </div>

      {/* Value Proposition */}
      <div className="p-3 bg-primary-subtle/20 rounded-lg">
        <p className="text-sm text-default font-medium">
          Earn 200 credits for each friend who starts using the bot
        </p>
        <p className="text-xs text-muted mt-1">
          Your friends also get 50 bonus credits when they sign up with your link
        </p>
      </div>

      {/* Referral Link (not code) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-surface rounded-lg border border-border">
          <Link className="w-4 h-4 text-muted flex-shrink-0" />
          <span className="text-sm text-default flex-1 truncate">
            {referralLink || 'Loading...'}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-primary-subtle rounded transition-colors flex-shrink-0"
            title="Copy link"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4 text-muted" />
            )}
          </button>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 px-4 py-2 text-sm font-medium bg-surface hover:bg-primary-subtle/50 text-default rounded-lg transition-colors flex items-center justify-center gap-2 border border-border"
          >
            <Copy className="w-4 h-4" />
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <button
            onClick={handleShare}
            className="flex-1 px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Summary Stats (only if there are referrals) */}
      {(stats?.totalReferrals ?? 0) > 0 && (
        <div className="flex items-center justify-between text-sm py-2 border-t border-border">
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
        <div className="pt-2 border-t border-border">
          <ReferralList referrals={referrals} />
        </div>
      )}
    </div>
  );
}
