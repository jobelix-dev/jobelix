/**
 * useReferral Hook - Manages referral code, stats, and referrals list
 */

import { useState, useCallback, useEffect } from 'react';

export interface ReferralStats {
  code: string;
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  totalCreditsEarned: number;
}

export interface ReferralItem {
  id: string;
  firstName: string;
  status: 'pending' | 'completed';
  createdAt: string;
  completedAt: string | null;
  creditsEarned: number;
}

export interface UseReferralReturn {
  stats: ReferralStats | null;
  referrals: ReferralItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useReferral(): UseReferralReturn {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReferralData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch both code/stats and referrals list in parallel
      const [codeResponse, listResponse] = await Promise.all([
        fetch('/api/student/referral/code'),
        fetch('/api/student/referral/list'),
      ]);
      
      // Handle code/stats response
      if (!codeResponse.ok) {
        // Non-students get 403, don't show error
        if (codeResponse.status === 403) {
          setStats(null);
          setReferrals([]);
          return;
        }
        throw new Error('Failed to fetch referral data');
      }

      const codeData = await codeResponse.json();
      
      setStats({
        code: codeData.code,
        totalReferrals: codeData.total_referrals,
        pendingReferrals: codeData.pending_referrals,
        completedReferrals: codeData.completed_referrals,
        totalCreditsEarned: codeData.total_credits_earned,
      });

      // Handle referrals list response
      if (listResponse.ok) {
        const listData = await listResponse.json();
        setReferrals(listData.referrals ?? []);
      } else {
        // Don't fail completely if list fails
        console.warn('Failed to fetch referrals list');
        setReferrals([]);
      }
    } catch (err) {
      console.error('Referral fetch error:', err);
      setError('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchReferralData();
  }, [fetchReferralData]);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  return { stats, referrals, loading, error, refresh };
}
