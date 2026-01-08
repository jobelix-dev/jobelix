/**
 * WorkConfigForm Component
 * 
 * Handles work configuration:
 * - remote_mode, employment_type
 * - start_date, availability
 */

'use client';

import { OfferWorkConfig, DateObject } from '@/lib/types';

interface WorkConfigFormProps {
  data: OfferWorkConfig;
  onChange: (data: OfferWorkConfig) => void;
}

export default function WorkConfigForm({ data, onChange }: WorkConfigFormProps) {
  const handleChange = (field: keyof OfferWorkConfig, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleDateChange = (field: 'start_date', dateField: keyof DateObject, value: string) => {
    const currentDate = data[field] || { year: new Date().getFullYear(), month: null };
    const newDate: DateObject = {
      ...currentDate,
      [dateField]: dateField === 'year' ? parseInt(value) : (value ? parseInt(value) : null),
    };
    handleChange(field, newDate);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Work Configuration</h3>
      </div>

      {/* Remote Mode and Employment Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Remote Mode
          </label>
          <select
            value={data.remote_mode || ''}
            onChange={(e) => handleChange('remote_mode', e.target.value || null)}
            className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          >
            <option value="">Not specified</option>
            <option value="full_remote">Full Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on_site">On Site</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Employment Type
          </label>
          <select
            value={data.employment_type || ''}
            onChange={(e) => handleChange('employment_type', e.target.value || null)}
            className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          >
            <option value="">Not specified</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </div>
      </div>

      {/* Start Date */}
      <div>
        <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
          Desired Start Date
        </label>
        <div className="grid grid-cols-2 gap-4">
          <select
            value={data.start_date?.month || ''}
            onChange={(e) => handleDateChange('start_date', 'month', e.target.value)}
            className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          >
            <option value="">Month</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
          <input
            type="number"
            value={data.start_date?.year || new Date().getFullYear()}
            onChange={(e) => handleDateChange('start_date', 'year', e.target.value)}
            className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
            placeholder="Year"
            min={new Date().getFullYear()}
          />
        </div>
      </div>

      {/* Availability */}
      <div>
        <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
          Availability Preference
        </label>
        <select
          value={data.availability || ''}
          onChange={(e) => handleChange('availability', e.target.value || null)}
          className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
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
