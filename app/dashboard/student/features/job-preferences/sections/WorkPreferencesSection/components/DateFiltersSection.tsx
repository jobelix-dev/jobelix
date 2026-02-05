/**
 * JobOfferRecencySection Component
 * 
 * Section for selecting job offer recency filters for job postings
 */

'use client';

import React from 'react';
import { AlertCircle, Calendar } from 'lucide-react';
import CheckboxGroup from './CheckboxGroup';

interface JobOfferRecencySectionProps {
  values: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
  hasError?: boolean;
  tourId?: string;
}

const JOB_OFFER_RECENCY_OPTIONS = [
  { key: 'date_24_hours', label: 'Past 24 hours' },
  { key: 'date_week', label: 'Past week' },
  { key: 'date_month', label: 'Past month' },
  { key: 'date_all_time', label: 'All time' },
];

export default function JobOfferRecencySection({
  values,
  onChange,
  hasError = false,
  tourId,
}: JobOfferRecencySectionProps) {
  return (
    <div className="space-y-3" id={tourId}>
      <h4 className="text-sm font-semibold text-primary-hover flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Job Offer Recency
        {hasError && <AlertCircle className="w-4 h-4 text-warning" />}
      </h4>

      <CheckboxGroup
        label=""
        options={JOB_OFFER_RECENCY_OPTIONS}
        values={values}
        onChange={onChange}
        columns={1}
        hasError={hasError}
      />
    </div>
  );
}
