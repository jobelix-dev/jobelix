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
      <h4 className="text-sm font-semibold text-primary-hover flex items-center gap-2">
        <Ban className="w-4 h-4" />
        Filters & Exclusions
      </h4>

      <ArrayInputField
        label="Company Blacklist"
        placeholder="e.g., CompanyName Inc"
        value={companyBlacklist}
        onChange={(val) => onChange('company_blacklist', val)}
        tagColorClass="bg-primary-subtle/30 text-primary-hover"
      />

      <ArrayInputField
        label="Job Title Blacklist"
        placeholder="e.g., Senior, Lead"
        value={titleBlacklist}
        onChange={(val) => onChange('title_blacklist', val)}
        tagColorClass="bg-primary-subtle/30 text-primary-hover"
      />
    </div>
  );
}
