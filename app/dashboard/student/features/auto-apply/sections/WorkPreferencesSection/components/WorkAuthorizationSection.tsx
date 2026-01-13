/**
 * WorkAuthorizationSection Component
 * 
 * Section for work authorization (EU and US)
 */

'use client';

import React from 'react';
import { Globe } from 'lucide-react';

interface WorkAuthorizationSectionProps {
  values: {
    eu_work_authorization: boolean;
    us_work_authorization: boolean;
  };
  onChange: (field: string, value: boolean) => void;
}

export default function WorkAuthorizationSection({
  values,
  onChange,
}: WorkAuthorizationSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        <Globe className="w-5 h-5 text-purple-600" />
        Work Authorization
      </h3>

      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.eu_work_authorization}
            onChange={(e) => onChange('eu_work_authorization', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            Authorized to work in EU
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.us_work_authorization}
            onChange={(e) => onChange('us_work_authorization', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            Authorized to work in US
          </span>
        </label>
      </div>
    </div>
  );
}
