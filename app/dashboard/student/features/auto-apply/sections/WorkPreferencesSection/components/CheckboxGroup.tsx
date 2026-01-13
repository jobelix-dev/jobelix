/**
 * CheckboxGroup Component
 * 
 * Grid of checkboxes for selecting multiple options (experience levels, job types, etc.)
 */

'use client';

import React from 'react';

interface CheckboxOption {
  key: string;
  label: string;
}

interface CheckboxGroupProps {
  label: string;
  options: CheckboxOption[];
  values: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
  columns?: number;
}

export default function CheckboxGroup({
  label,
  options,
  values,
  onChange,
  columns = 2,
}: CheckboxGroupProps) {
  const gridClass = columns === 2 ? 'grid-cols-2' : `grid-cols-${columns}`;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <div className={`grid ${gridClass} gap-3`}>
        {options.map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={values[key] || false}
              onChange={(e) => onChange(key, e.target.checked)}
              className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
