/**
 * WorkPreferencesSection Component
 * 
 * Section for work preferences (in-person, relocation, assessments, etc.)
 */

'use client';

import React from 'react';
import { Settings, Clock, DollarSign } from 'lucide-react';

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
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
        <Settings className="w-4 h-4" />
        Additional Preferences
      </h4>

      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.in_person_work}
            onChange={(e) => onChange('in_person_work', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-900 border-purple-200 dark:border-purple-800 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
            Open to in-person work
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.open_to_relocation}
            onChange={(e) => onChange('open_to_relocation', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-900 border-purple-200 dark:border-purple-800 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
            Open to relocation
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.willing_to_complete_assessments}
            onChange={(e) => onChange('willing_to_complete_assessments', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-900 border-purple-200 dark:border-purple-800 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
            Willing to complete assessments
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.willing_to_undergo_drug_tests}
            onChange={(e) => onChange('willing_to_undergo_drug_tests', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-900 border-purple-200 dark:border-purple-800 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
            Willing to undergo drug tests
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.willing_to_undergo_background_checks}
            onChange={(e) => onChange('willing_to_undergo_background_checks', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-900 border-purple-200 dark:border-purple-800 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
            Willing to undergo background checks
          </span>
        </label>
      </div>

      <div className="space-y-3 pt-4 border-t border-purple-100 dark:border-purple-900/40">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <Clock className="w-4 h-4" />
            Notice Period
          </label>
          <input
            type="text"
            value={values.notice_period || ''}
            onChange={(e) => onChange('notice_period', e.target.value)}
            placeholder="e.g., 2 weeks, Immediate"
            className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <DollarSign className="w-4 h-4" />
            Salary Expectation (USD/year)
          </label>
          <input
            type="number"
            min="0"
            step="1000"
            value={values.salary_expectation_usd || ''}
            onChange={(e) => onChange('salary_expectation_usd', parseInt(e.target.value) || 0)}
            placeholder="e.g., 100000"
            className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
