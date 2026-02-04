/**
 * Credits Section - Display balance, claim daily, and purchase options
 */

'use client';

import { useState } from 'react';
import { RefreshCw, Gift, Coins } from 'lucide-react';

interface CreditsSectionProps {
  balance: number;
  loading: boolean;
  claiming: boolean;
  refreshing: boolean;
  error: string | null;
  onClaim: () => Promise<{ success: boolean; message: string }>;
  onBuy: (plan: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const CREDIT_PLANS = [
  { id: 'credits_250', credits: 250, price: '$4.99', popular: false },
  { id: 'credits_750', credits: 750, price: '$9.99', popular: true },
  { id: 'credits_1500', credits: 1500, price: '$14.99', popular: false },
];

export default function CreditsSection({
  balance,
  loading,
  claiming,
  refreshing,
  error,
  onClaim,
  onBuy,
  onRefresh,
}: CreditsSectionProps) {
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [buyingPlan, setBuyingPlan] = useState<string | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  const handleClaim = async () => {
    const result = await onClaim();
    if (!result.success) {
      setClaimMessage(result.message);
      setTimeout(() => setClaimMessage(null), 2000);
    }
  };

  const handleBuy = async (planId: string) => {
    setBuyingPlan(planId);
    try {
      await onBuy(planId);
    } catch (err) {
      console.error('Purchase failed:', err);
    } finally {
      setBuyingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-background rounded-xl p-4 shadow-sm">
        <div className="text-sm text-muted text-center py-4">Loading credits...</div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-xl p-3 sm:p-4 shadow-sm space-y-3 sm:space-y-4">
      <h3 className="text-base sm:text-lg font-semibold text-default">Credits</h3>

      {/* Current Balance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 p-3 sm:p-4 bg-primary-subtle/20 rounded-lg">
        <div className="flex items-center gap-3">
          <Coins className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm text-muted">Available Balance</p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl sm:text-3xl font-bold text-success">
                {balance.toLocaleString()}
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-success">
                ≈ {Math.floor(balance / 7)} jobs
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="p-2 hover:bg-primary-subtle rounded-lg transition-colors disabled:cursor-not-allowed self-end sm:self-auto"
          title="Refresh balance"
        >
          <RefreshCw className={`w-4 h-4 text-muted ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Daily Claim */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 p-3 bg-success-subtle/10 rounded-lg border border-success/20">
        <div className="flex items-center gap-3">
          <Gift className="w-5 h-5 text-success flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-default">Daily Free Credits</p>
            <p className="text-xs text-muted">Claim 50 credits every day</p>
          </div>
        </div>
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="px-4 py-2 text-sm font-medium bg-success hover:bg-success/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {claiming ? 'Claiming...' : 'Claim 50'}
        </button>
      </div>

      {claimMessage && (
        <p className="text-xs text-warning text-center">{claimMessage}</p>
      )}

      {/* Buy Credits Toggle Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 p-3 bg-primary-subtle/10 rounded-lg border border-primary/20">
        <div className="flex items-center gap-3">
          <Coins className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-default">Buy Credits</p>
            <p className="text-xs text-muted">Purchase credits to continue applying</p>
          </div>
        </div>
        <button
          onClick={() => setShowBuyCredits(!showBuyCredits)}
          className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {showBuyCredits ? 'Hide' : 'Show'}
        </button>
      </div>

      {/* Purchase Options */}
      {showBuyCredits && (
        <div className="animate-in slide-in-from-top-2 duration-300">
          <p className="text-sm font-medium text-default mb-3">Choose a Plan</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CREDIT_PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => handleBuy(plan.id)}
                disabled={buyingPlan !== null}
                className="relative p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary-subtle/5 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <p className="text-2xl font-bold text-default">{plan.credits}</p>
                <p className="text-xs text-muted">credits</p>
                <p className="text-sm font-semibold text-primary mt-2">{plan.price}</p>
                {buyingPlan === plan.id && (
                  <p className="text-xs text-muted mt-1">Redirecting...</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}      {error && (
        <p className="text-xs text-error text-center">{error}</p>
      )}
    </div>
  );
}
