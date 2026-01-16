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
        tagColorClass="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
      />

      <ArrayInputField
        label="Locations"
        placeholder="e.g., San Francisco, Remote, United States"
        value={locations}
        onChange={(val) => onChange('locations', val)}
        icon={<MapPin className="w-4 h-4" />}
        tagColorClass="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
      />

      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={remoteWork}
          onChange={(e) => onChange('remote_work', e.target.checked)}
          className="w-4 h-4 text-purple-600 dark:text-purple-400 bg-white dark:bg-zinc-900 border-purple-200 dark:border-purple-800 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
        />
        <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
          Include remote opportunities
        </span>
      </label>
    </div>
  );
}
