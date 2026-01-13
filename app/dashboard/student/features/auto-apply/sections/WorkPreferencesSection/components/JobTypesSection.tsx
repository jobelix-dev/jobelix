/**
 * JobTypesSection Component
 * 
 * Section for selecting job types
 */

'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import CheckboxGroup from './CheckboxGroup';

interface JobTypesSectionProps {
  values: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
}

const JOB_TYPE_OPTIONS = [
  { key: 'job_full_time', label: 'Full-time' },
  { key: 'job_part_time', label: 'Part-time' },
  { key: 'job_contract', label: 'Contract' },
  { key: 'job_temporary', label: 'Temporary' },
  { key: 'job_internship', label: 'Internship' },
  { key: 'job_volunteer', label: 'Volunteer' },
  { key: 'job_other', label: 'Other' },
];

export default function JobTypesSection({
  values,
  onChange,
}: JobTypesSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        <Clock className="w-5 h-5 text-purple-600" />
        Job Types
      </h3>

      <CheckboxGroup
        label="Select all that apply"
        options={JOB_TYPE_OPTIONS}
        values={values}
        onChange={onChange}
        columns={2}
      />
    </div>
  );
}
