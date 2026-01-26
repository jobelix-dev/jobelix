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
    return <div className="text-sm text-muted">Loading...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Credits display and actions in one row */}
      <div className="flex items-center gap-4 p-3 bg-primary-subtle/20 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Credits:</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
            {balance.toLocaleString()}
          </span>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-1 hover:bg-primary-subtle rounded transition-colors disabled:cursor-not-allowed"
            title="Refresh credits"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted transition-transform ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex gap-2">
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="px-3 py-1.5 text-sm font-medium bg-primary hover:bg-primary-hover text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {claiming ? 'Claiming...' : '🎁 Claim 50'}
          </button>
          <button 
            onClick={handleBuy}
            className="px-3 py-1.5 text-sm font-medium bg-primary hover:bg-primary-hover text-white rounded-lg transition-all"
          >
            💳 Buy
          </button>
        </div>
      </div>

      {showBuyWarning && (
        <div className="p-2 bg-error-subtle/20 border border-error rounded text-xs text-error">
          Failed to create checkout. Please try again.
        </div>
      )}

      {showClaimWarning && (
        <div className="p-2 bg-warning-subtle/20 border border-warning rounded text-xs text-warning">
          Already claimed today
        </div>
      )}

      {error && (
        <div className="p-2 bg-error-subtle/20 border border-error rounded text-xs text-error">
          {error}
        </div>
      )}
    </div>
  );
}
