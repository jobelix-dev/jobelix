/**
 * SocialLinksInput Component
 * Fixed fields for specific platforms: GitHub, LinkedIn, StackOverflow, Kaggle, LeetCode
 */

import React from 'react';
import { Github, Linkedin, Code2, Trophy, Code } from 'lucide-react';
import { SocialLinkEntry } from '@/lib/shared/types';

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
            <label className="flex items-center gap-2 text-sm font-medium text-muted">
              <Icon className="w-4 h-4" />
              {label}
            </label>
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
                errorMessage
                  ? 'border-warning ring-1 ring-warning/50'
                  : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30'
              } bg-white`}
            >
              <input
                type="url"
                value={value}
                onChange={(e) => updatePlatform(key, e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1 bg-transparent border-none outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            {errorMessage && (
              <p className="text-xs text-warning px-1">
                {errorMessage}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
