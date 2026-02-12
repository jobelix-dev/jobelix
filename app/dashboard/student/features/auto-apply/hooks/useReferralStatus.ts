/**
 * useReferralStatus Hook - Check if current user was referred
 * 
 * Used to show the "You have bonus credits waiting" banner to referred users.
 */

import { useState, useCallback, useEffect } from 'react';

export interface ReferralStatus {
  isReferred: boolean;
  status: 'pending' | 'completed' | null;
  bonusCredits: number | null;
  referrerFirstName: string | null;
}

export interface UseReferralStatusReturn {
  status: ReferralStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useReferralStatus(): UseReferralStatusReturn {
  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/student/referral/status');
      
      if (!response.ok) {
        // Don't show error for auth issues or non-students - just return empty status
        if (response.status === 401 || response.status === 403) {
          setStatus({ isReferred: false, status: null, bonusCredits: null, referrerFirstName: null });
          return;
        }
        // Log 500 errors but still return empty status (non-critical feature)
        if (response.status === 500) {
          console.error('Referral status: Server error (500), treating as not referred');
          setStatus({ isReferred: false, status: null, bonusCredits: null, referrerFirstName: null });
          return;
        }
        throw new Error('Failed to fetch referral status');
      }

      const data = await response.json();
      
      setStatus({
        isReferred: data.isReferred,
        status: data.status,
        bonusCredits: data.bonusCredits,
        referrerFirstName: data.referrerFirstName,
      });
    } catch (err) {
      console.error('Referral status fetch error:', err);
      setError('Failed to load referral status');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, loading, error, refresh };
}
