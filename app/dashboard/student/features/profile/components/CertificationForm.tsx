/**
 * CertificationForm Component
 * Collapsible form for editing a single certification/award entry
 */

import React, { useState } from 'react';
import { Trash2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { CertificationEntry } from '@/lib/types';

interface CertificationFormProps {
  data: CertificationEntry;
  onChange: (field: keyof CertificationEntry, value: any) => void;
  onRemove: () => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
}

export default function CertificationForm({ data, onChange, onRemove, fieldErrors = {}, disabled = false }: CertificationFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Create display title
  const certName = data.name?.trim() || 'New Certification/Award';
  const organization = data.issuing_organization?.trim();
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
                {certName}
              </span>
              {hasErrors && (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">Needs update</span>
                </span>
              )}
            </div>
            {organization && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                {organization}
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
          title="Remove certification"
        >
          <Trash2 className="w-4 h-4" />
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-purple-200 dark:border-purple-800 space-y-4 bg-purple-50/30 dark:bg-purple-900/10">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Certification/Award Name</label>
                {fieldErrors.name && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>{fieldErrors.name}</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={data.name}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="e.g., AWS Certified Solutions Architect"
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm rounded border ${
                  fieldErrors.name 
                    ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50' 
                    : 'border-purple-200 dark:border-purple-800'
                } bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Issuing Organization (optional)</label>
              <input
                type="text"
                value={data.issuing_organization || ''}
                onChange={(e) => onChange('issuing_organization', e.target.value || null)}
                placeholder="e.g., Amazon Web Services"
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">URL (optional)</label>
            <input
              type="url"
              value={data.url || ''}
              onChange={(e) => onChange('url', e.target.value || null)}
              placeholder="https://..."
              disabled={disabled}
              className="w-full px-3 py-2 text-sm rounded border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      )}
    </div>
  );
}
