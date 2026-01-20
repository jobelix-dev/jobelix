/**
 * DateFiltersSection Component
 * 
 * Section for selecting date filters for job postings
 */

'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import CheckboxGroup from './CheckboxGroup';

interface DateFiltersSectionProps {
  values: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
}

const DATE_FILTER_OPTIONS = [
  { key: 'date_24_hours', label: 'Past 24 hours' },
  { key: 'date_week', label: 'Past week' },
  { key: 'date_month', label: 'Past month' },
  { key: 'date_all_time', label: 'All time' },
];

export default function DateFiltersSection({
  values,
  onChange,
}: DateFiltersSectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-primary-hover flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Date Filters
      </h4>

      <CheckboxGroup
        label=""
        options={DATE_FILTER_OPTIONS}
        values={values}
        onChange={onChange}
        columns={1}
      />
    </div>
  );
}
