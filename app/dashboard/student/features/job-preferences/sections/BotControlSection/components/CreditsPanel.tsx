/**
 * Credits Panel - Display and manage credit balance
 */

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface CreditsPanelProps {
  balance: number;
  loading: boolean;
  claiming: boolean;
  refreshing: boolean;
  error: string | null;
  onClaim: () => Promise<{ success: boolean; message: string }>;
  onBuy: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function CreditsPanel({
  balance,
  loading,
  claiming,
  refreshing,
  error,
  onClaim,
  onBuy,
  onRefresh,
}: CreditsPanelProps) {
  const [showClaimWarning, setShowClaimWarning] = useState(false);
  const [showBuyWarning, setShowBuyWarning] = useState(false);

  const handleClaim = async () => {
    const result = await onClaim();
    if (!result.success && result.message === 'Already claimed today') {
      setShowClaimWarning(true);
      setTimeout(() => setShowClaimWarning(false), 1500);
    }
  };

  const handleBuy = async () => {
    try {
      await onBuy();
    } catch (err) {
      setShowBuyWarning(true);
      setTimeout(() => setShowBuyWarning(false), 1500);
    }
  };

  if (loading) {
    return <div className="text-sm text-zinc-500">Loading...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Available Credits</span>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors disabled:cursor-not-allowed"
            title="Refresh credits"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-500 dark:text-zinc-400 transition-transform ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          {balance.toLocaleString()}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="flex-1 px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {claiming ? 'Claiming...' : '🎁 Claim Daily 50'}
        </button>
        <button 
          onClick={handleBuy}
          className="flex-1 px-4 py-2 text-sm font-medium border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-zinc-700 dark:text-zinc-300 rounded-lg transition-all"
        >
          💳 Buy Credits
        </button>
      </div>

      {showBuyWarning && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
          Failed to create checkout. Please try again.
        </div>
      )}

      {showClaimWarning && (
        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300">
          Already claimed today
        </div>
      )}

      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
