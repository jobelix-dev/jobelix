/**
 * StartupSignalsForm Component
 * 
 * Handles startup signals:
 * - mission
 * - stage
 * - team_size
 * - seniority
 */

'use client';

import { OfferStartupSignals } from '@/lib/types';

interface StartupSignalsFormProps {
  data: OfferStartupSignals;
  onChange: (data: OfferStartupSignals) => void;
}

export default function StartupSignalsForm({ data, onChange }: StartupSignalsFormProps) {
  const handleChange = (field: keyof OfferStartupSignals, value: string | number | null) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Startup Context</h3>
      </div>

      {/* Mission */}
      <div>
        <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
          Mission / Vision
        </label>
        <textarea
          value={data.mission || ''}
          onChange={(e) => handleChange('mission', e.target.value || null)}
          className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          placeholder="What's the company's mission and vision?"
          rows={4}
        />
      </div>

      {/* Stage */}
      <div>
        <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
          Company Stage
        </label>
        <select
          value={data.stage || ''}
          onChange={(e) => handleChange('stage', e.target.value || null)}
          className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
        >
          <option value="">Not specified</option>
          <option value="pre_seed">Pre-Seed</option>
          <option value="seed">Seed</option>
          <option value="series_a">Series A</option>
          <option value="series_b">Series B</option>
          <option value="series_c">Series C+</option>
          <option value="growth">Growth Stage</option>
        </select>
      </div>

      {/* Team Size */}
      <div>
        <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
          Team Size
        </label>
        <input
          type="number"
          value={data.team_size || ''}
          onChange={(e) => handleChange('team_size', e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          placeholder="e.g. 15"
          min={1}
        />
      </div>

      {/* Seniority */}
      <div>
        <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
          Target Seniority Level
        </label>
        <select
          value={data.seniority || ''}
          onChange={(e) => handleChange('seniority', e.target.value || null)}
          className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
        >
          <option value="">Not specified</option>
          <option value="junior">Junior (0-2 years)</option>
          <option value="mid">Mid-level (2-5 years)</option>
          <option value="senior">Senior (5-8 years)</option>
          <option value="staff">Staff (8+ years)</option>
          <option value="lead">Lead / Principal</option>
        </select>
      </div>
    </div>
  );
}
