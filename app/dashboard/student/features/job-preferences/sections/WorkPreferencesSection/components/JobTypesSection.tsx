/**
 * JobTypesSection Component
 * 
 * Section for selecting job types
 */

'use client';

import React from 'react';
import { FileText } from 'lucide-react';
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
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-primary-hover flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Contract Type
      </h4>

      <CheckboxGroup
        label=""
        options={JOB_TYPE_OPTIONS}
        values={values}
        onChange={onChange}
        columns={2}
      />
    </div>
  );
}
