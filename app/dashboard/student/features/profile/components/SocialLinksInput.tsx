/**
 * SocialLinksInput Component
 * Compact two-column social link containers
 */

import React from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import { SocialLinkEntry } from '@/lib/types';

interface SocialLinksInputProps {
  social_links: SocialLinkEntry[];
  onChange: (social_links: SocialLinkEntry[]) => void;
  fieldErrors?: Record<number, { link?: string }>;
  disabled?: boolean;
}

export default function SocialLinksInput({ social_links, onChange, fieldErrors = {}, disabled = false }: SocialLinksInputProps) {
  const updateLink = (index: number, value: string) => {
    const updated = [...social_links];
    updated[index] = { link: value };
    onChange(updated);
  };

  const removeLink = (index: number) => {
    onChange(social_links.filter((_, i) => i !== index));
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {social_links.map((link, index) => {
        const errorMessage = fieldErrors[index]?.link;
        
        return (
          <div key={index} className="space-y-1">
            <div className="h-4">
              {errorMessage && (
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500 px-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                errorMessage
                  ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50'
                  : 'border-zinc-200 dark:border-zinc-700'
              } bg-zinc-50/50 dark:bg-zinc-900/30`}
            >
              <input
                type="text"
                value={link.link}
                onChange={(e) => updateLink(index, e.target.value)}
                placeholder="e.g., https://linkedin.com/in/yourname"
                disabled={disabled}
                className="flex-1 bg-transparent border-none focus:outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                onClick={() => removeLink(index)}
                disabled={disabled}
                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                title="Remove link"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
