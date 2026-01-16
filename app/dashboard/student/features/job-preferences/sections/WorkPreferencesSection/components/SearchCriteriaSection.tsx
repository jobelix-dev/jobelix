/**
 * SearchCriteriaSection Component
 * 
 * Section for essential job search criteria (positions, locations)
 */

'use client';

import React from 'react';
import { Search, MapPin } from 'lucide-react';
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
        icon={<Search className="w-4 h-4" />}
        tagColorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
      />

      <ArrayInputField
        label="Locations"
        placeholder="e.g., San Francisco, Remote, United States"
        value={locations}
        onChange={(val) => onChange('locations', val)}
        icon={<MapPin className="w-4 h-4" />}
        tagColorClass="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
      />

      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={remoteWork}
          onChange={(e) => onChange('remote_work', e.target.checked)}
          className="w-4 h-4 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-zinc-500 transition-colors cursor-pointer"
        />
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          Include remote opportunities
        </span>
      </label>
    </div>
  );
}
