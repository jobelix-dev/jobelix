/**
 * CompensationForm Component
 * 
 * Handles compensation and benefits information:
 * - salary_min, salary_max
 * - salary_currency, salary_period
 * - equity, equity_range
 * - perks and benefits
 */

'use client';

import { OfferCompensation, OfferPerkEntry } from '@/lib/shared/types';
import PerksInput from './PerksInput';

interface CompensationFormProps {
  data: OfferCompensation;
  onChange: (data: OfferCompensation) => void;
  perks: OfferPerkEntry[];
  onPerksChange: (perks: OfferPerkEntry[]) => void;
}

export default function CompensationForm({ data, onChange, perks, onPerksChange }: CompensationFormProps) {
  const handleChange = (field: keyof OfferCompensation, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-muted">Compensation and Benefits</h3>
      </div>

      {/* Salary Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Minimum Salary
          </label>
          <input
            type="number"
            value={data.salary_min || ''}
            onChange={(e) => handleChange('salary_min', e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            placeholder="50000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Maximum Salary
          </label>
          <input
            type="number"
            value={data.salary_max || ''}
            onChange={(e) => handleChange('salary_max', e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            placeholder="80000"
          />
        </div>
      </div>

      {/* Currency and Period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Currency
          </label>
          <select
            value={data.salary_currency || 'EUR'}
            onChange={(e) => handleChange('salary_currency', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          >
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
            <option value="CHF">CHF</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Period
          </label>
          <select
            value={data.salary_period || 'year'}
            onChange={(e) => handleChange('salary_period', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          >
            <option value="year">Yearly</option>
            <option value="month">Monthly</option>
            <option value="hour">Hourly</option>
          </select>
        </div>
      </div>

      {/* Equity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Equity Available
          </label>
          <select
            value={data.equity === true ? 'true' : 'false'}
            onChange={(e) => handleChange('equity', e.target.value === 'true')}
            className="w-full px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Equity Range (%)
          </label>
          <input
            type="text"
            value={data.equity_range || ''}
            onChange={(e) => handleChange('equity_range', e.target.value || null)}
            className="w-full px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-60"
            placeholder="e.g. 0.1-0.5"
            disabled={data.equity !== true}
          />
        </div>
      </div>

      {/* Perks and Benefits */}
      <div>
        <PerksInput
          perks={perks}
          onChange={onPerksChange}
        />
      </div>
    </div>
  );
}
