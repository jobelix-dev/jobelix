/**
 * ReferralList - Shows who the user has referred with status
 * 
 * Clean, theme-respecting list with:
 * - Avatar placeholder with user icon
 * - Name and join date
 * - Status badge (completed with credits or pending)
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, CheckCircle, User } from 'lucide-react';
import type { ReferralItem } from '../hooks/useReferral';

interface ReferralListProps {
  referrals: ReferralItem[];
}

export default function ReferralList({ referrals }: ReferralListProps) {
  const [expanded, setExpanded] = useState(false);
  
  if (referrals.length === 0) {
    return null;
  }

  // Show first 3 by default, expand to show all
  const INITIAL_SHOW = 3;
  const hasMore = referrals.length > INITIAL_SHOW;
  const visibleReferrals = expanded ? referrals : referrals.slice(0, INITIAL_SHOW);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-2 pt-2">
      <p className="text-xs text-muted font-medium uppercase tracking-wide">
        Your Referrals
      </p>
      
      <div className="space-y-1.5">
        {visibleReferrals.map((referral) => (
          <div 
            key={referral.id}
            className="flex items-center justify-between p-2.5 bg-surface rounded-lg border border-border/50"
          >
            <div className="flex items-center gap-2.5">
              {/* Avatar placeholder */}
              <div className="w-8 h-8 rounded-full bg-primary-subtle flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              
              {/* Name and date */}
              <div>
                <p className="text-sm font-medium text-default">
                  {referral.firstName}
                </p>
                <p className="text-xs text-muted">
                  Joined {formatDate(referral.createdAt)}
                </p>
              </div>
            </div>

            {/* Status badge */}
            {referral.status === 'completed' ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success-subtle">
                <CheckCircle className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-medium text-success">+{referral.creditsEarned}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-warning-subtle">
                <Clock className="w-3.5 h-3.5 text-warning" />
                <span className="text-xs font-medium text-warning">Pending</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show more/less toggle */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted hover:text-default transition-colors w-full justify-center py-1.5"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show less</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Show {referrals.length - INITIAL_SHOW} more</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
