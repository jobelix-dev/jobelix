/**
 * SocialLinksInput Component
 * Fixed fields for specific platforms: GitHub, LinkedIn, StackOverflow, Kaggle, LeetCode
 */

import React from 'react';
import { Github, Linkedin, Code2, Trophy, Code } from 'lucide-react';
import { SocialLinkEntry } from '@/lib/types';

interface SocialLinksInputProps {
  social_links: SocialLinkEntry;
  onChange: (social_links: SocialLinkEntry) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
}

const platforms = [
  { key: 'github' as const, label: 'GitHub', icon: Github, placeholder: 'https://github.com/username' },
  { key: 'linkedin' as const, label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/username' },
  { key: 'stackoverflow' as const, label: 'Stack Overflow', icon: Code2, placeholder: 'https://stackoverflow.com/users/...' },
  { key: 'kaggle' as const, label: 'Kaggle', icon: Trophy, placeholder: 'https://kaggle.com/username' },
  { key: 'leetcode' as const, label: 'LeetCode', icon: Code, placeholder: 'https://leetcode.com/username' },
];

export default function SocialLinksInput({ social_links, onChange, fieldErrors = {}, disabled = false }: SocialLinksInputProps) {
  const updatePlatform = (platform: keyof SocialLinkEntry, value: string) => {
    onChange({
      ...social_links,
      [platform]: value.trim() || null,
    });
  };

  return (
    <div className="space-y-3">
      {platforms.map(({ key, label, icon: Icon, placeholder }) => {
        const value = social_links[key] || '';
        const errorMessage = fieldErrors[key];
        
        return (
          <div key={key} className="space-y-1">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <Icon className="w-4 h-4" />
              {label}
            </label>
            <div
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${
                errorMessage
                  ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50'
                  : 'border-purple-200 dark:border-purple-800'
              } bg-white dark:bg-zinc-900/50`}
            >
              <input
                type="url"
                value={value}
                onChange={(e) => updatePlatform(key, e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1 bg-transparent border-none focus:outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            {errorMessage && (
              <p className="text-xs text-amber-600 dark:text-amber-500 px-1">
                {errorMessage}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
