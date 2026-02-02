/**
 * DatePicker Component
 * 
 * Year/Month selector with native dropdowns.
 * Uses native select for best mobile compatibility.
 */

'use client';

import React from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

interface DatePickerProps {
  year: number | null;
  month: number | null;
  onYearChange: (year: number | null) => void;
  onMonthChange: (month: number | null) => void;
  label?: string;
  yearError?: string;
  monthError?: string;
  disabled?: boolean;
  monthId?: string;
  yearId?: string;
}

export default function DatePicker({ 
  year, 
  month, 
  onYearChange, 
  onMonthChange, 
  label,
  yearError,
  monthError,
  disabled = false,
  monthId,
  yearId
}: DatePickerProps) {
  
  const handleYearChange = (value: string) => {
    if (value === '') {
      onYearChange(null);
    } else {
      onYearChange(parseInt(value, 10));
    }
  };
  
  const handleMonthChange = (value: string) => {
    if (value === '') {
      onMonthChange(null);
    } else {
      onMonthChange(parseInt(value, 10));
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1950 + 11 }, (_, i) => 1950 + i).reverse();
  
  // Short month names for mobile
  const months = [
    { value: 1, label: 'Jan', fullLabel: 'January' },
    { value: 2, label: 'Feb', fullLabel: 'February' },
    { value: 3, label: 'Mar', fullLabel: 'March' },
    { value: 4, label: 'Apr', fullLabel: 'April' },
    { value: 5, label: 'May', fullLabel: 'May' },
    { value: 6, label: 'Jun', fullLabel: 'June' },
    { value: 7, label: 'Jul', fullLabel: 'July' },
    { value: 8, label: 'Aug', fullLabel: 'August' },
    { value: 9, label: 'Sep', fullLabel: 'September' },
    { value: 10, label: 'Oct', fullLabel: 'October' },
    { value: 11, label: 'Nov', fullLabel: 'November' },
    { value: 12, label: 'Dec', fullLabel: 'December' },
  ];

  const hasError = yearError || monthError;

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <label className="text-sm font-medium">{label}</label>
          {hasError && (
            <span className="flex items-center gap-1 text-xs text-warning truncate">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {yearError && monthError ? 'Required' : yearError || monthError}
              </span>
            </span>
          )}
        </div>
      )}
      <div className="flex gap-2">
        {/* Month dropdown */}
        <div className="relative flex-1 min-w-0">
          <select
            id={monthId}
            value={month || ''}
            onChange={(e) => handleMonthChange(e.target.value)}
            disabled={disabled}
            className={`w-full appearance-none px-3 py-2 pr-8 text-sm rounded-lg border ${
              monthError 
                ? 'border-warning ring-1 ring-warning/30' 
                : 'border-border/50'
            } bg-white focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <option value="">Month</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.fullLabel}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        </div>
        
        {/* Year dropdown */}
        <div className="relative w-24 sm:w-28 flex-shrink-0">
          <select
            id={yearId}
            value={year || ''}
            onChange={(e) => handleYearChange(e.target.value)}
            disabled={disabled}
            className={`w-full appearance-none px-3 py-2 pr-8 text-sm rounded-lg border ${
              yearError 
                ? 'border-warning ring-1 ring-warning/30' 
                : 'border-border/50'
            } bg-white focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <option value="">Year</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
