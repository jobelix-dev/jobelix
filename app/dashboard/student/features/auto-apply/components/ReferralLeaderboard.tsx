/**
 * ReferralLeaderboard - Shows top referrers for gamification
 * 
 * Uses app's forest green color scheme:
 * - primary for emphasis and current user
 * - warning for 1st place (gold-ish)
 * - muted for other ranks
 * - success for credits earned
 */

'use client';

import { Trophy, Medal, Award, Crown, User } from 'lucide-react';
import { useLeaderboard, LeaderboardEntry } from '../hooks';

export default function ReferralLeaderboard() {
  const { leaderboard, userRank, loading, error } = useLeaderboard(10);

  if (loading) {
    return (
      <div className="bg-background rounded-xl p-4 shadow-sm">
        <div className="text-sm text-muted text-center py-4">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return null; // Silently fail - leaderboard is non-critical
  }

  // Don't show if there's no data
  if (leaderboard.length === 0) {
    return (
      <div className="bg-background rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-default">Leaderboard</h3>
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-muted">No referrals yet. Be the first!</p>
          <p className="text-xs text-muted mt-1">Share your link to climb the leaderboard</p>
        </div>
      </div>
    );
  }

  // Get rank icon based on position - use primary/muted only
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-4 h-4 text-primary" />;
      case 2:
        return <Medal className="w-4 h-4 text-muted" />;
      case 3:
        return <Award className="w-4 h-4 text-muted" />;
      default:
        return <span className="text-xs font-bold text-muted w-4 text-center">{rank}</span>;
    }
  };

  // Get background style based on rank - use primary colors only
  const getRankStyle = (entry: LeaderboardEntry) => {
    if (entry.isCurrentUser) {
      return 'bg-primary-subtle border border-primary/30';
    }
    if (entry.rank === 1) {
      return 'bg-primary-subtle/50';
    }
    return 'bg-surface';
  };

  // Check if user is on the leaderboard
  const userOnLeaderboard = leaderboard.some(e => e.isCurrentUser);

  return (
    <div className="bg-background rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base sm:text-lg font-semibold text-default">Leaderboard</h3>
        <Trophy className="w-5 h-5 text-primary" />
      </div>

      {/* Leaderboard entries */}
      <div className="space-y-1.5">
        {leaderboard.map((entry) => (
          <div
            key={`${entry.rank}-${entry.firstName}`}
            className={`flex items-center justify-between p-2.5 rounded-lg ${getRankStyle(entry)}`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Rank indicator */}
              <div className="w-6 h-6 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                entry.isCurrentUser ? 'bg-primary/20' : 'bg-primary-subtle'
              }`}>
                <User className={`w-4 h-4 ${entry.isCurrentUser ? 'text-primary' : 'text-muted'}`} />
              </div>

              {/* Name */}
              <p className={`text-sm font-medium truncate ${entry.isCurrentUser ? 'text-primary' : 'text-default'}`}>
                {entry.firstName}
                {entry.isCurrentUser && <span className="text-xs ml-1 text-muted">(you)</span>}
              </p>
            </div>

            {/* Stats */}
            <div className="text-right">
              <p className="text-sm font-medium text-default">
                {entry.completedCount} {entry.completedCount === 1 ? 'referral' : 'referrals'}
              </p>
              <p className="text-xs text-success">+{entry.creditsEarned} credits</p>
            </div>
          </div>
        ))}
      </div>

      {/* User's rank if not on visible leaderboard - no divider */}
      {!userOnLeaderboard && userRank && userRank.rank !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary-subtle border border-primary/20">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">#{userRank.rank}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-medium text-primary">You</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-default">
                {userRank.completedCount} {userRank.completedCount === 1 ? 'referral' : 'referrals'}
              </p>
              <p className="text-xs text-success">+{userRank.creditsEarned} credits</p>
            </div>
          </div>
        </div>
      )}

      {/* Motivational message - no divider */}
      {!userOnLeaderboard && (!userRank || userRank.rank === null) && (
        <div className="mt-3 text-center">
          <p className="text-xs text-muted">
            Refer friends to appear on the leaderboard!
          </p>
        </div>
      )}
    </div>
  );
}
