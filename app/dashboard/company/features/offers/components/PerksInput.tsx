/**
 * PerksInput Component
 * 
 * Manages array of perks and benefits
 */

'use client';

import { OfferPerkEntry } from '@/lib/types';

interface PerksInputProps {
  perks: OfferPerkEntry[];
  onChange: (perks: OfferPerkEntry[]) => void;
}

export default function PerksInput({ perks, onChange }: PerksInputProps) {
  const addPerk = () => {
    onChange([...perks, { text: '' }]);
  };

  const updatePerk = (index: number, text: string) => {
    const updated = [...perks];
    updated[index] = { text };
    onChange(updated);
  };

  const removePerk = (index: number) => {
    onChange(perks.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Perks & Benefits</h3>
        <button
          type="button"
          onClick={addPerk}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Perk
        </button>
      </div>

      {perks.length === 0 && (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">No perks added yet. Click "Add Perk" to start.</p>
      )}

      <div className="space-y-2">
        {perks.map((perk, index) => (
          <div key={index} className="flex gap-2 items-start">
            <span className="text-zinc-500 dark:text-zinc-400 mt-2 flex-shrink-0">✓</span>
            <input
              type="text"
              value={perk.text}
              onChange={(e) => updatePerk(index, e.target.value)}
              className="flex-1 px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              placeholder="e.g. Remote work flexibility"
            />
            <button
              type="button"
              onClick={() => removePerk(index)}
              className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 text-sm px-2 py-2 transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
