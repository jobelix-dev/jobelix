/**
 * DatePicker Component
 * 
 * Year/Month selector with dropdowns.
 * Works with separate year and month number values.
 */

'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

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
  
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const hasError = yearError || monthError;

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium">{label}</label>
          {hasError && (
            <span className="flex items-center gap-1 text-xs text-warning">
              <AlertCircle className="w-3 h-3" />
              <span>
                {yearError && monthError ? `${yearError}, ${monthError}` : yearError || monthError}
              </span>
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <select
          id={monthId}
          value={month || ''}
          onChange={(e) => handleMonthChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-3 py-2 text-sm rounded border ${
            monthError 
              ? 'border-warning ring-1 ring-warning/50/50' 
              : 'border-border'
          } bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          <option value="">Month</option>
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select
          id={yearId}
          value={year || ''}
          onChange={(e) => handleYearChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-3 py-2 text-sm rounded border ${
            yearError 
              ? 'border-warning ring-1 ring-warning/50/50' 
              : 'border-border'
          } bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          <option value="">Year</option>
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
