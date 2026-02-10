/**
 * useLeaderboard Hook - Fetches referral leaderboard data
 */

import { useState, useCallback, useEffect } from 'react';

export interface LeaderboardEntry {
  rank: number;
  firstName: string;
  completedCount: number;
  creditsEarned: number;
  isCurrentUser: boolean;
}

export interface UserRank {
  rank: number | null;
  completedCount: number;
  creditsEarned: number;
  totalParticipants: number;
}

export interface UseLeaderboardReturn {
  leaderboard: LeaderboardEntry[];
  userRank: UserRank | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLeaderboard(limit: number = 10): UseLeaderboardReturn {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setError(null);
      
      const response = await fetch(`/api/student/referral/leaderboard?limit=${limit}`);
      
      if (!response.ok) {
        // Non-students get 403, don't show error
        if (response.status === 403) {
          setLeaderboard([]);
          setUserRank(null);
          return;
        }
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      
      setLeaderboard(data.leaderboard ?? []);
      setUserRank(data.userRank ?? null);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { leaderboard, userRank, loading, error, refresh };
}
