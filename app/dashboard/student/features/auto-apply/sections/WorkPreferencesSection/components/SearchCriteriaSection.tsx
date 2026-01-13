/**
 * SearchCriteriaSection Component
 * 
 * Section for job search criteria (positions, locations, blacklists)
 */

'use client';

import React from 'react';
import { Search, MapPin, Ban } from 'lucide-react';
import ArrayInputField from './ArrayInputField';

interface SearchCriteriaSectionProps {
  positions: string[];
  locations: string[];
  companyBlacklist: string[];
  titleBlacklist: string[];
  remoteWork: boolean;
  onChange: (field: string, value: string[] | boolean) => void;
}

export default function SearchCriteriaSection({
  positions,
  locations,
  companyBlacklist,
  titleBlacklist,
  remoteWork,
  onChange,
}: SearchCriteriaSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        <Search className="w-5 h-5 text-purple-600" />
        Search Criteria
      </h3>

      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={remoteWork}
          onChange={(e) => onChange('remote_work', e.target.checked)}
          className="w-4 h-4 text-purple-600 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer"
        />
        <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
          Include remote work opportunities
        </span>
      </label>

      <ArrayInputField
        label="Target Positions"
        placeholder="e.g., Software Engineer, Data Analyst"
        value={positions}
        onChange={(val) => onChange('positions', val)}
        icon={<Search className="w-4 h-4" />}
        tagColorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
      />

      <ArrayInputField
        label="Preferred Locations"
        placeholder="e.g., San Francisco, Remote"
        value={locations}
        onChange={(val) => onChange('locations', val)}
        icon={<MapPin className="w-4 h-4" />}
        tagColorClass="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
      />

      <ArrayInputField
        label="Company Blacklist"
        placeholder="e.g., CompanyName Inc"
        value={companyBlacklist}
        onChange={(val) => onChange('company_blacklist', val)}
        icon={<Ban className="w-4 h-4" />}
        tagColorClass="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
      />

      <ArrayInputField
        label="Job Title Blacklist"
        placeholder="e.g., Senior, Lead"
        value={titleBlacklist}
        onChange={(val) => onChange('title_blacklist', val)}
        icon={<Ban className="w-4 h-4" />}
        tagColorClass="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
      />
    </div>
  );
}
