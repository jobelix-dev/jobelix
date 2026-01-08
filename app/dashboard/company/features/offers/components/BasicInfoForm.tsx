/**
 * BasicInfoForm Component
 * 
 * Handles basic offer information:
 * - Job title (position_name)
 * - Short description
 * - Employment type
 * - Location(s)
 * - Remote mode
 * - Availability
 */

'use client';

import { OfferBasicInfo, OfferLocationEntry } from '@/lib/types';
import LocationsInput from './LocationsInput';

interface BasicInfoFormProps {
  data: OfferBasicInfo;
  onChange: (data: OfferBasicInfo) => void;
  locations: OfferLocationEntry[];
  onLocationsChange: (locations: OfferLocationEntry[]) => void;
  remoteMode: 'onsite' | 'hybrid' | 'remote' | null;
  onRemoteModeChange: (mode: 'onsite' | 'hybrid' | 'remote' | null) => void;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern' | null;
  onEmploymentTypeChange: (type: 'full_time' | 'part_time' | 'contract' | 'intern' | null) => void;
  availability: string | null;
  onAvailabilityChange: (availability: string | null) => void;
}

export default function BasicInfoForm({ 
  data, 
  onChange, 
  locations, 
  onLocationsChange,
  remoteMode,
  onRemoteModeChange,
  employmentType,
  onEmploymentTypeChange,
  availability,
  onAvailabilityChange
}: BasicInfoFormProps) {
  const handleChange = (field: keyof OfferBasicInfo, value: string | null) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Basic Information</h3>
      </div>

      {/* Job Title */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Job Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.position_name || ''}
          onChange={(e) => handleChange('position_name', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
          placeholder="e.g. Senior Full-Stack Engineer"
          required
        />
      </div>

      {/* Short Description */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Short Description
        </label>
        <textarea
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value || null)}
          className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
          placeholder="Describe the role, responsibilities, and what makes it exciting..."
          rows={4}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Give candidates a compelling overview of the opportunity
        </p>
      </div>

      {/* Employment Type and Remote Mode */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Employment Type
          </label>
          <select
            value={employmentType || ''}
            onChange={(e) => onEmploymentTypeChange(e.target.value ? e.target.value as 'full_time' | 'part_time' | 'contract' | 'intern' : null)}
            className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
          >
            <option value="">Not specified</option>
            <option value="full_time">Full Time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Remote Mode
          </label>
          <select
            value={remoteMode || ''}
            onChange={(e) => onRemoteModeChange(e.target.value ? e.target.value as 'onsite' | 'hybrid' | 'remote' : null)}
            className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
          >
            <option value="">Not specified</option>
            <option value="onsite">On Site</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </div>
      </div>

      {/* Locations */}
      <div>
        <LocationsInput
          locations={locations}
          onChange={onLocationsChange}
        />
      </div>

      {/* Availability */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Availability Preference
        </label>
        <select
          value={availability || ''}
          onChange={(e) => onAvailabilityChange(e.target.value || null)}
          className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
        >
          <option value="">Not specified</option>
          <option value="immediate">Immediate</option>
          <option value="1_month">Within 1 Month</option>
          <option value="3_months">Within 3 Months</option>
          <option value="flexible">Flexible</option>
        </select>
      </div>
    </div>
  );
}
