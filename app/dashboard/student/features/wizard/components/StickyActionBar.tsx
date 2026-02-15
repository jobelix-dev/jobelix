/**
 * StickyActionBar Component
 *
 * Fixed bottom bar used on every wizard step for prominent navigation actions.
 *
 * Layout: [Back] — [Status text] — [Primary action button]
 *
 * Features:
 * - Fixed to bottom of viewport with backdrop blur
 * - Blue Back button (optional, highly visible)
 * - Center status text (draft / saving / saved)
 * - Blue primary action button (Save & Continue / Continue)
 * - Proper z-index (above content, below modals/tours)
 */

'use client';

import { ArrowLeft, ArrowRight, Loader2, Check } from 'lucide-react';

interface StickyActionBarProps {
  /** Back button handler. If undefined, back button is hidden. */
  onBack?: () => void;
  /** Primary action handler (Save & Continue / Continue). If undefined, action button is hidden. */
  onAction?: () => void;
  /** Label for the primary action button */
  actionLabel?: string;
  /** Whether the primary action is disabled */
  actionDisabled?: boolean;
  /** Whether all buttons are disabled (e.g. during processing) */
  allDisabled?: boolean;
  /** Status text shown in the center */
  statusText?: string;
  /** Whether an async operation is in progress (shows spinner on button) */
  loading?: boolean;
  /** Whether the last action succeeded (shows checkmark briefly) */
  success?: boolean;
  /** Optional id for the action button (used by validation tour to target it) */
  actionButtonId?: string;
}

export default function StickyActionBar({
  onBack,
  onAction,
  actionLabel = 'Save & Continue',
  actionDisabled = false,
  allDisabled = false,
  statusText,
  loading = false,
  success = false,
  actionButtonId,
}: StickyActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      <div className="bg-surface/90 backdrop-blur-md border-t border-border/30 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Back button — blue outline for visibility */}
          <div className="w-auto flex-shrink-0">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                disabled={allDisabled}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                  text-primary border border-primary/30 bg-primary/5
                  hover:bg-primary/10 hover:border-primary/50 rounded-lg
                  transition-colors cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div className="w-20" />
            )}
          </div>

          {/* Center status */}
          <div className="flex-1 text-center min-w-0">
            {statusText && (
              <p className="text-xs text-muted truncate">{statusText}</p>
            )}
          </div>

          {/* Primary action */}
          <div className="w-auto flex-shrink-0 flex justify-end">
            {onAction ? (
              <button
                id={actionButtonId}
                type="button"
                onClick={onAction}
                disabled={actionDisabled || allDisabled || loading}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                  bg-primary hover:bg-primary-hover text-white rounded-lg
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
                  shadow-sm shadow-primary/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : success ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    {actionLabel}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <div className="w-20" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
