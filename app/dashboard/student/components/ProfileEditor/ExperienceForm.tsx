/**
 * ExperienceForm Component
 * Form for editing a single work experience entry
 */

import React from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import { ExperienceEntry } from '@/lib/types';
import DatePicker from './DatePicker';

interface ExperienceFormProps {
  data: ExperienceEntry;
  onChange: (field: keyof ExperienceEntry, value: any) => void;
  onRemove: () => void;
  fieldErrors?: Record<string, string>;
}

export default function ExperienceForm({ data, onChange, onRemove, fieldErrors = {} }: ExperienceFormProps) {
  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-4">
          {/* Two column layout for short fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Company/Organization</label>
                {fieldErrors.organisation_name && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>Required</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={data.organisation_name}
                onChange={(e) => onChange('organisation_name', e.target.value)}
                placeholder="e.g., Google"
                className={`w-full px-3 py-2 text-sm rounded border ${
                  fieldErrors.organisation_name 
                    ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50' 
                    : 'border-zinc-300 dark:border-zinc-600'
                } bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Position/Title</label>
                {fieldErrors.position_name && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>Required</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={data.position_name}
                onChange={(e) => onChange('position_name', e.target.value)}
                placeholder="e.g., Software Engineer"
                className={`w-full px-3 py-2 text-sm rounded border ${
                  fieldErrors.position_name 
                    ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50' 
                    : 'border-zinc-300 dark:border-zinc-600'
                } bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent`}
              />
            </div>

            <div>
              <DatePicker
                year={data.start_year}
                month={data.start_month}
                onYearChange={(value) => onChange('start_year', value)}
                onMonthChange={(value) => onChange('start_month', value)}
                label="Start Date"
                yearError={fieldErrors.start_year}
                monthError={fieldErrors.start_month}
              />
            </div>

            <div>
              <DatePicker
                year={data.end_year}
                month={data.end_month}
                onYearChange={(value) => onChange('end_year', value)}
                onMonthChange={(value) => onChange('end_month', value)}
                label="End Date"
                yearError={fieldErrors.end_year}
                monthError={fieldErrors.end_month}
              />
            </div>
          </div>

          {/* Full width description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
            <textarea
              value={data.description || ''}
              onChange={(e) => onChange('description', e.target.value || null)}
              placeholder="e.g., Led team of 5 developers, implemented new features..."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent resize-none"
            />
          </div>
        </div>

        <button
          onClick={onRemove}
          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
          title="Remove experience"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
