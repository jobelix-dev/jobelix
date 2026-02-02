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
  hasError?: boolean;
}

export default function CheckboxGroup({
  label,
  options,
  values,
  onChange,
  columns = 2,
  hasError = false,
}: CheckboxGroupProps) {
  // Mobile-first: single column on mobile, then use specified columns
  const gridClass = columns === 2 ? 'sm:grid-cols-2' : `sm:grid-cols-${columns}`;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <div className={`grid grid-cols-1 ${gridClass} gap-2 sm:gap-3`}>
        {options.map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={values[key] || false}
              onChange={(e) => onChange(key, e.target.checked)}
              className={`w-4 h-4 text-primary bg-white border rounded focus:ring-2 transition-colors cursor-pointer ${
                hasError
                  ? 'border-warning focus:ring-warning/30'
                  : 'border-border focus:ring-primary'
              }`}
            />
            <span className="text-sm text-muted group-hover:text-primary-hover transition-colors">
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
