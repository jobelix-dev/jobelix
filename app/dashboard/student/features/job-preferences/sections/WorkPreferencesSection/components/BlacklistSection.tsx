/**
 * BlacklistSection Component
 * 
 * Section for company and job title blacklists
 */

'use client';

import React from 'react';
import { Ban } from 'lucide-react';
import ArrayInputField from './ArrayInputField';

interface BlacklistSectionProps {
  companyBlacklist: string[];
  titleBlacklist: string[];
  onChange: (field: string, value: string[]) => void;
}

export default function BlacklistSection({
  companyBlacklist,
  titleBlacklist,
  onChange,
}: BlacklistSectionProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
        <Ban className="w-4 h-4" />
        Filters & Exclusions
      </h4>

      <ArrayInputField
        label="Company Blacklist"
        placeholder="e.g., CompanyName Inc"
        value={companyBlacklist}
        onChange={(val) => onChange('company_blacklist', val)}
        tagColorClass="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
      />

      <ArrayInputField
        label="Job Title Blacklist"
        placeholder="e.g., Senior, Lead"
        value={titleBlacklist}
        onChange={(val) => onChange('title_blacklist', val)}
        tagColorClass="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
      />
    </div>
  );
}
