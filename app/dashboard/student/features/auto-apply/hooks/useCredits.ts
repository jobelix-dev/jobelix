/**
 * Custom hook for managing credit balance and operations
 */

import { useState, useEffect, useCallback } from 'react';

interface CreditBalance {
  balance: number;
  total_earned: number;
  total_purchased: number;
  total_used: number;
  last_updated: string | null;
}

interface ClaimStatus {
  can_claim: boolean;
  claimed_today: boolean;
  last_claim: string | null;
  next_claim_available: string | null;
}

export function useCredits() {
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/student/credits/balance', { credentials: 'include' });
      const data = await response.json();
      
      if (response.status === 401) {
        setError('Please log in to view credits');
        setLoading(false);
        return;
      }
      
      if (response.ok) {
        setCredits(data);
      } else {
        setError(data.error || 'Failed to load credits');
      }
      setLoading(false);
    } catch {
      setError('Failed to load credits');
      setLoading(false);
    }
  }, []);

  const fetchClaimStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/student/credits/can-claim', { credentials: 'include' });
      const data = await response.json();
      if (response.ok) setClaimStatus(data);
    } catch {
      console.error('Failed to fetch claim status');
    }
  }, []);

  const claimCredits = useCallback(async () => {
    if (claimStatus?.claimed_today) {
      return { success: false, message: 'Already claimed today' };
    }

    try {
      setClaiming(true);
      setError(null);
      const response = await fetch('/api/student/credits/claim', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      
      if (response.status === 401) {
        setError('Please log in to claim credits');
        return { success: false, message: 'Please log in to claim credits' };
      }
      
      if (response.ok) {
        await fetchCredits();
        await fetchClaimStatus();
        return { success: true, message: 'Credits claimed successfully' };
      } else {
        const message = data.error || 'Failed to claim credits';
        setError(message);
        return { success: false, message };
      }
    } catch {
      const message = 'Failed to claim credits';
      setError(message);
      return { success: false, message };
    } finally {
      setClaiming(false);
    }
  }, [claimStatus, fetchCredits, fetchClaimStatus]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchCredits(), fetchClaimStatus()]);
    setTimeout(() => setRefreshing(false), 800);
  }, [fetchCredits, fetchClaimStatus]);

  useEffect(() => {
    fetchCredits();
    fetchClaimStatus();
  }, [fetchCredits, fetchClaimStatus]);

  return {
    credits,
    claimStatus,
    loading,
    claiming,
    refreshing,
    error,
    claimCredits,
    refresh,
  };
}
