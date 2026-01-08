/**
 * CompensationForm Component
 * 
 * Handles compensation information:
 * - salary_min, salary_max
 * - salary_currency, salary_period
 * - equity, equity_range
 */

'use client';

import { OfferCompensation } from '@/lib/types';

interface CompensationFormProps {
  data: OfferCompensation;
  onChange: (data: OfferCompensation) => void;
}

export default function CompensationForm({ data, onChange }: CompensationFormProps) {
  const handleChange = (field: keyof OfferCompensation, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Compensation</h3>
      </div>

      {/* Salary Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Minimum Salary
          </label>
          <input
            type="number"
            value={data.salary_min || ''}
            onChange={(e) => handleChange('salary_min', e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
            placeholder="50000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Maximum Salary
          </label>
          <input
            type="number"
            value={data.salary_max || ''}
            onChange={(e) => handleChange('salary_max', e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
            placeholder="80000"
          />
        </div>
      </div>

      {/* Currency and Period */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Currency
          </label>
          <select
            value={data.salary_currency || 'EUR'}
            onChange={(e) => handleChange('salary_currency', e.target.value)}
            className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          >
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
            <option value="CHF">CHF</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Period
          </label>
          <select
            value={data.salary_period || 'yearly'}
            onChange={(e) => handleChange('salary_period', e.target.value)}
            className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          >
            <option value="yearly">Yearly</option>
            <option value="monthly">Monthly</option>
            <option value="hourly">Hourly</option>
          </select>
        </div>
      </div>

      {/* Equity */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Equity Available
          </label>
          <select
            value={data.equity === null ? '' : data.equity.toString()}
            onChange={(e) => handleChange('equity', e.target.value === '' ? null : e.target.value === 'true')}
            className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          >
            <option value="">Not specified</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Equity Range (%)
          </label>
          <input
            type="text"
            value={data.equity_range || ''}
            onChange={(e) => handleChange('equity_range', e.target.value || null)}
            className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
            placeholder="e.g. 0.1-0.5"
            disabled={data.equity !== true}
          />
        </div>
      </div>
    </div>
  );
}
