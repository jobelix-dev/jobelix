/**
 * PerksInput Component
 * 
 * Manages array of perks and benefits
 */

'use client';

import { Plus, Trash2 } from 'lucide-react';
import { OfferPerkEntry } from '@/lib/shared/types';

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
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium">Perks & Benefits</label>
        <button
          type="button"
          onClick={addPerk}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-surface hover:bg-primary-subtle rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Perk
        </button>
      </div>

      {perks.length === 0 && (
        <p className="text-muted text-sm text-center py-4">No perks added yet</p>
      )}

      <div className="space-y-2">
        {perks.map((perk, index) => (
          <div key={index} className="flex gap-2 items-start">
            <span className="text-muted mt-2 flex-shrink-0">✓</span>
            <input
              type="text"
              value={perk.text}
              onChange={(e) => updatePerk(index, e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              placeholder="e.g. Remote work flexibility"
            />
            <button
              type="button"
              onClick={() => removePerk(index)}
              className="p-1.5 text-error hover:bg-error-subtle rounded transition-colors"
              title="Remove perk"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
