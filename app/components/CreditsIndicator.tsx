/**
 * CreditsIndicator Component
 * 
 * Compact credit balance button in the top-right header.
 * Clicking it opens a centered overlay modal with full credits management:
 * balance, daily claim, buy credits, referral bonus, invite friends, leaderboard.
 * 
 * Also exports CreditsModal for use in other contexts (e.g., AutoApply step).
 */

'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Zap, Loader2, ChevronRight, X } from 'lucide-react';
import { useCredits } from '@/app/dashboard/student/features/auto-apply/hooks/useCredits';
import CreditsSection from '@/app/dashboard/student/features/auto-apply/components/CreditsSection';
import ReferralBonusBanner from '@/app/dashboard/student/features/auto-apply/components/ReferralBonusBanner';
import ReferralSection from '@/app/dashboard/student/features/auto-apply/components/ReferralSection';
import ReferralLeaderboard from '@/app/dashboard/student/features/auto-apply/components/ReferralLeaderboard';

// =============================================================================
// CreditsModal — centered overlay with credits management
// =============================================================================

interface CreditsModalProps {
  credits: ReturnType<typeof useCredits>;
  onBuyCredits: (plan: string) => Promise<void>;
  onClose: () => void;
}

export function CreditsModal({ credits, onBuyCredits, onClose }: CreditsModalProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] bg-surface rounded-2xl border border-border/30 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/20 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-default">Credits & Referrals</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-primary-subtle/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-5 space-y-5">
          {/* Credits: balance, daily claim, buy */}
          <CreditsSection
            balance={credits.credits?.balance || 0}
            loading={credits.loading}
            claiming={credits.claiming}
            refreshing={credits.refreshing}
            error={credits.error}
            onClaim={credits.claimCredits}
            onBuy={onBuyCredits}
            onRefresh={credits.refresh}
          />

          {/* Referral Bonus Banner */}
          <ReferralBonusBanner />

          {/* Invite Friends */}
          <ReferralSection />

          {/* Leaderboard */}
          <ReferralLeaderboard />
        </div>
      </div>
    </div>,
    document.body
  );
}

// =============================================================================
// useCreditsModal — shared hook for credits modal state
// =============================================================================

export function useCreditsModal() {
  const credits = useCredits();
  const [modalOpen, setModalOpen] = useState(false);

  const handleBuyCredits = useCallback(async (plan: string) => {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Stripe checkout error:', data);
      throw new Error(data.error || 'Failed to create checkout session');
    }

    if (data.url) {
      window.location.href = data.url;
    }
  }, []);

  return {
    credits,
    modalOpen,
    openModal: () => setModalOpen(true),
    closeModal: () => setModalOpen(false),
    handleBuyCredits,
  };
}

// =============================================================================
// CreditsIndicator — compact header button (optional, not used in wizard)
// =============================================================================

export default function CreditsIndicator() {
  const { credits, modalOpen, openModal, closeModal, handleBuyCredits } = useCreditsModal();

  const balance = credits.credits?.balance ?? 0;
  const canClaim = credits.claimStatus?.can_claim && !credits.claimStatus?.claimed_today;

  if (credits.loading) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/80">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted" />
        <span className="text-xs text-muted">...</span>
      </div>
    );
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={openModal}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg 
          transition-colors cursor-pointer
          bg-background/80 hover:bg-primary-subtle/40 text-default
        `}
      >
        <Zap className="w-3.5 h-3.5 text-primary" />
        <span className="text-sm font-semibold tabular-nums">{balance}</span>
        {canClaim && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        )}
        <ChevronRight className="w-3 h-3 text-muted" />
      </button>

      {/* Credits overlay modal */}
      {modalOpen && (
        <CreditsModal
          credits={credits}
          onBuyCredits={handleBuyCredits}
          onClose={closeModal}
        />
      )}
    </>
  );
}
