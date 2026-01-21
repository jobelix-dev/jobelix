/**
 * BlacklistSection Component
 * 
 * Section for company and job title blacklists
 */

'use client';

import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { Ban } from 'lucide-react';
import ArrayInputField, { ArrayInputFieldRef } from './ArrayInputField';

interface BlacklistSectionProps {
  companyBlacklist: string[];
  titleBlacklist: string[];
  onChange: (field: string, value: string[]) => void;
}

export interface BlacklistSectionRef {
  flushAllPendingInputs: () => void;
}

const BlacklistSection = forwardRef<BlacklistSectionRef, BlacklistSectionProps>((
  {
    companyBlacklist,
    titleBlacklist,
    onChange,
  },
  ref
) => {
  const companyRef = useRef<ArrayInputFieldRef>(null);
  const titleRef = useRef<ArrayInputFieldRef>(null);

  // Expose flush method to parent
  useImperativeHandle(ref, () => ({
    flushAllPendingInputs: () => {
      companyRef.current?.flushPendingInput();
      titleRef.current?.flushPendingInput();
    },
  }));

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-primary-hover flex items-center gap-2">
        <Ban className="w-4 h-4" />
        Filters & Exclusions
      </h4>

      <ArrayInputField
        ref={companyRef}
        label="Company Blacklist"
        placeholder="e.g., CompanyName Inc"
        value={companyBlacklist}
        onChange={(val) => onChange('company_blacklist', val)}
        tagColorClass="bg-primary-subtle/30 text-primary-hover"
      />

      <ArrayInputField
        ref={titleRef}
        label="Job Title Blacklist"
        placeholder="e.g., Senior, Lead"
        value={titleBlacklist}
        onChange={(val) => onChange('title_blacklist', val)}
        tagColorClass="bg-primary-subtle/30 text-primary-hover"
      />
    </div>
  );
});

BlacklistSection.displayName = 'BlacklistSection';

export default BlacklistSection;
