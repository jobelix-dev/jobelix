/**
 * PersonalInfoSection Component
 * 
 * Section for personal details used in job applications
 */

'use client';

import React from 'react';
import { User } from 'lucide-react';

interface PersonalInfoSectionProps {
  values: {
    date_of_birth: string;
    pronouns: string;
    gender: string;
    ethnicity: string;
    is_veteran: boolean;
    has_disability: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

export default function PersonalInfoSection({
  values,
  onChange,
}: PersonalInfoSectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
        <User className="w-4 h-4" />
        Personal Information
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Date of Birth
          </label>
          <input
            type="date"
            value={values.date_of_birth || ''}
            onChange={(e) => onChange('date_of_birth', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Pronouns
          </label>
          <input
            type="text"
            value={values.pronouns || ''}
            onChange={(e) => onChange('pronouns', e.target.value)}
            placeholder="e.g., he/him, she/her"
            className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Gender
          </label>
          <input
            type="text"
            value={values.gender || ''}
            onChange={(e) => onChange('gender', e.target.value)}
            placeholder="e.g., Male, Female"
            className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Ethnicity
          </label>
          <input
            type="text"
            value={values.ethnicity || ''}
            onChange={(e) => onChange('ethnicity', e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.is_veteran}
            onChange={(e) => onChange('is_veteran', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-900 border-purple-200 dark:border-purple-800 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
            I am a veteran
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.has_disability}
            onChange={(e) => onChange('has_disability', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-900 border-purple-200 dark:border-purple-800 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
            I have a disability
          </span>
        </label>
      </div>
    </div>
  );
}
