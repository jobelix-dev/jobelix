/**
 * WorkPreferencesSection Component
 * 
 * Section for work preferences (in-person, relocation, assessments, etc.)
 */

'use client';

import React from 'react';
import { Settings } from 'lucide-react';

interface WorkPreferencesSectionProps {
  values: {
    in_person_work: boolean;
    open_to_relocation: boolean;
    willing_to_complete_assessments: boolean;
    willing_to_undergo_drug_tests: boolean;
    willing_to_undergo_background_checks: boolean;
    notice_period: string;
    salary_expectation_usd: number;
  };
  onChange: (field: string, value: string | boolean | number) => void;
}

export default function WorkPreferencesSection({
  values,
  onChange,
}: WorkPreferencesSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        <Settings className="w-5 h-5 text-purple-600" />
        Additional Preferences
      </h3>

      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.in_person_work}
            onChange={(e) => onChange('in_person_work', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            Open to in-person work
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.open_to_relocation}
            onChange={(e) => onChange('open_to_relocation', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            Open to relocation
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.willing_to_complete_assessments}
            onChange={(e) => onChange('willing_to_complete_assessments', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            Willing to complete assessments
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.willing_to_undergo_drug_tests}
            onChange={(e) => onChange('willing_to_undergo_drug_tests', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            Willing to undergo drug tests
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.willing_to_undergo_background_checks}
            onChange={(e) => onChange('willing_to_undergo_background_checks', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            Willing to undergo background checks
          </span>
        </label>
      </div>

      <div className="space-y-3 pt-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Notice Period
          </label>
          <input
            type="text"
            value={values.notice_period || ''}
            onChange={(e) => onChange('notice_period', e.target.value)}
            placeholder="e.g., 2 weeks, Immediate"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Salary Expectation (USD/year)
          </label>
          <input
            type="number"
            min="0"
            step="1000"
            value={values.salary_expectation_usd || ''}
            onChange={(e) => onChange('salary_expectation_usd', parseInt(e.target.value) || 0)}
            placeholder="e.g., 100000"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
