/**
 * CollapsibleSection Component
 * 
 * Generic expand/collapse wrapper for entry forms.
 * Used by Education, Experience, Publication, and Certification forms.
 */

'use client';

import { useState, ReactNode } from 'react';
import { Trash2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  hasErrors?: boolean;
  onRemove?: () => void;
  disabled?: boolean;
  forceExpanded?: boolean;
  removeTitle?: string;
  children: ReactNode;
}

export default function CollapsibleSection({
  title,
  subtitle,
  hasErrors = false,
  onRemove,
  disabled = false,
  forceExpanded = false,
  removeTitle = 'Remove',
  children,
}: CollapsibleSectionProps) {
  // Track internal expanded state separately; derive final state from forceExpanded prop
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = forceExpanded || internalExpanded;

  return (
    <div className="rounded-xl border border-border/50 bg-white shadow-sm">
      {/* Header - Always visible */}
      <div className="relative">
        <button
          onClick={() => setInternalExpanded(!internalExpanded)}
          className="w-full px-3 sm:px-4 py-3 flex items-center justify-between hover:bg-primary-subtle/30 transition-colors text-left rounded-t-xl"
        >
          <div className="flex-1 min-w-0 pr-16">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{title}</span>
              {hasErrors && (
                <span className="flex items-center gap-1.5 text-xs text-warning">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">Needs update</span>
                </span>
              )}
            </div>
            {subtitle && (
              <div className="text-xs text-muted truncate mt-0.5">{subtitle}</div>
            )}
          </div>

          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted" />
            )}
          </div>
        </button>

        {/* Delete button - positioned absolutely */}
        {onRemove && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onRemove();
            }}
            className={`absolute right-12 top-1/2 -translate-y-1/2 p-2 sm:p-1.5 text-error hover:bg-error-subtle rounded transition-colors ${
              disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            }`}
            title={removeTitle}
          >
            <Trash2 className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-3 sm:px-4 pb-4 pt-3 border-t border-border/30 space-y-4 bg-primary-subtle/10 rounded-b-xl">
          {children}
        </div>
      )}
    </div>
  );
}
