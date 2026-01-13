/**
 * PublicationForm Component
 * Collapsible form for editing a single publication entry
 */

import React, { useState } from 'react';
import { Trash2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { PublicationEntry } from '@/lib/shared/types';
import DatePicker from './DatePicker';

interface PublicationFormProps {
  data: PublicationEntry;
  onChange: (field: keyof PublicationEntry, value: any) => void;
  onRemove: () => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
}

export default function PublicationForm({ data, onChange, onRemove, fieldErrors = {}, disabled = false }: PublicationFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Create display title
  const title = data.title?.trim() || 'New Publication';
  const journal = data.journal_name?.trim();
  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
      {/* Header - Always visible */}
      <div className="relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left"
        >
          <div className="flex-1 min-w-0 pr-16">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {title}
              </span>
              {hasErrors && (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">Needs update</span>
                </span>
              )}
            </div>
            {journal && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                {journal}
              </div>
            )}
          </div>
          
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            )}
          </div>
        </button>
        
        {/* Delete button - positioned absolutely to avoid nesting */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onRemove();
          }}
          className={`absolute right-12 top-1/2 -translate-y-1/2 p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title="Remove publication"
        >
          <Trash2 className="w-4 h-4" />
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-purple-200 dark:border-purple-800 space-y-4 bg-purple-50/30 dark:bg-purple-900/10">
          {/* Two column layout */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Title</label>
                {fieldErrors.title && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>{fieldErrors.title}</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={data.title}
                onChange={(e) => onChange('title', e.target.value)}
                placeholder="e.g., Machine Learning in Healthcare"
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm rounded border ${
                  fieldErrors.title 
                    ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50' 
                    : 'border-purple-200 dark:border-purple-800'
                } bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Journal/Conference (optional)</label>
              <input
                type="text"
                value={data.journal_name || ''}
                onChange={(e) => onChange('journal_name', e.target.value || null)}
                placeholder="e.g., IEEE Transactions"
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <DatePicker
                year={data.publication_year}
                month={data.publication_month}
                onYearChange={(value) => onChange('publication_year', value)}
                onMonthChange={(value) => onChange('publication_month', value)}
                label="Publication Date (optional)"
                yearError={fieldErrors.publication_year}
                monthError={fieldErrors.publication_month}
                disabled={disabled}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Link (optional)</label>
              <input
                type="url"
                value={data.link || ''}
                onChange={(e) => onChange('link', e.target.value || null)}
                placeholder="https://doi.org/..."
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Full width description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
            <textarea
              value={data.description || ''}
              onChange={(e) => onChange('description', e.target.value || null)}
              placeholder="Brief abstract or summary..."
              rows={3}
              disabled={disabled}
              className="w-full px-3 py-2 text-sm rounded border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      )}
    </div>
  );
}
