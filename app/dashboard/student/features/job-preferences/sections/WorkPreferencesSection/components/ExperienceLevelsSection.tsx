/**
 * ExperienceLevelsSection Component
 * 
 * Section for selecting experience levels
 */

'use client';

import React from 'react';
import { Briefcase } from 'lucide-react';
import CheckboxGroup from './CheckboxGroup';

interface ExperienceLevelsSectionProps {
  values: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
}

const EXPERIENCE_OPTIONS = [
  { key: 'exp_internship', label: 'Internship' },
  { key: 'exp_entry', label: 'Entry level' },
  { key: 'exp_associate', label: 'Associate' },
  { key: 'exp_mid_senior', label: 'Mid-Senior level' },
  { key: 'exp_director', label: 'Director' },
  { key: 'exp_executive', label: 'Executive' },
];

export default function ExperienceLevelsSection({
  values,
  onChange,
}: ExperienceLevelsSectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
        <Briefcase className="w-4 h-4" />
        Experience Level
      </h4>

      <CheckboxGroup
        label=""
        options={EXPERIENCE_OPTIONS}
        values={values}
        onChange={onChange}
        columns={1}
      />
    </div>
  );
}
