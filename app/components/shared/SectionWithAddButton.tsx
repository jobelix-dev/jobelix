/**
 * SectionWithAddButton Component
 * 
 * Section wrapper with title and optional "Add" button.
 * Handles empty state display automatically.
 */

'use client';

import { ReactNode } from 'react';
import { Plus } from 'lucide-react';

interface SectionWithAddButtonProps {
  title: string;
  count?: number;
  showCount?: boolean;
  onAdd?: () => void;
  addLabel?: string;
  disabled?: boolean;
  emptyMessage?: string;
  isEmpty?: boolean;
  children: ReactNode;
}

export default function SectionWithAddButton({
  title,
  count,
  showCount = false,
  onAdd,
  addLabel,
  disabled = false,
  emptyMessage,
  isEmpty = false,
  children,
}: SectionWithAddButtonProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
        <h3 className="text-base sm:text-lg font-semibold text-muted">
          {title}
          {showCount && count !== undefined && count > 0 && (
            <span className="text-sm font-normal text-muted">
              {' '}({count})
            </span>
          )}
        </h3>
        {onAdd && addLabel && (
          <button
            onClick={onAdd}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {addLabel}
          </button>
        )}
      </div>

      {isEmpty && emptyMessage ? (
        <p className="text-sm text-muted text-center py-4">{emptyMessage}</p>
      ) : (
        children
      )}
    </div>
  );
}
