/**
 * SearchCriteriaSection Component
 * 
 * Section for essential job search criteria (positions, locations)
 */

'use client';

import React from 'react';
import { Target, MapPin } from 'lucide-react';
import ArrayInputField from './ArrayInputField';

interface SearchCriteriaSectionProps {
  positions: string[];
  locations: string[];
  remoteWork: boolean;
  onChange: (field: string, value: string[] | boolean) => void;
}

export default function SearchCriteriaSection({
  positions,
  locations,
  remoteWork,
  onChange,
}: SearchCriteriaSectionProps) {
  return (
    <div className="space-y-4">
      <ArrayInputField
        label="Target Positions"
        placeholder="e.g., Software Engineer, Data Analyst"
        value={positions}
        onChange={(val) => onChange('positions', val)}
        icon={<Target className="w-4 h-4" />}
        tagColorClass="bg-primary-subtle/30 text-primary-hover"
      />

      <ArrayInputField
        label="Locations"
        placeholder="e.g., San Francisco, Remote, United States"
        value={locations}
        onChange={(val) => onChange('locations', val)}
        icon={<MapPin className="w-4 h-4" />}
        tagColorClass="bg-primary-subtle/30 text-primary-hover"
      />

      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={remoteWork}
          onChange={(e) => onChange('remote_work', e.target.checked)}
          className="w-4 h-4 text-primary bg-white border border-border rounded focus:ring-2 focus:ring-primary transition-colors cursor-pointer"
        />
        <span className="text-sm text-muted group-hover:text-default transition-colors">
          Include remote opportunities
        </span>
      </label>
    </div>
  );
}
