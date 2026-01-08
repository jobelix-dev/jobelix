/**
 * ResponsibilitiesInput Component
 * 
 * Manages array of key responsibilities for the role
 */

'use client';

import { Plus, Trash2 } from 'lucide-react';
import { OfferResponsibilityEntry } from '@/lib/types';

interface ResponsibilitiesInputProps {
  responsibilities: OfferResponsibilityEntry[];
  onChange: (responsibilities: OfferResponsibilityEntry[]) => void;
}

export default function ResponsibilitiesInput({ responsibilities, onChange }: ResponsibilitiesInputProps) {
  const addResponsibility = () => {
    onChange([...responsibilities, { text: '' }]);
  };

  const updateResponsibility = (index: number, text: string) => {
    const updated = [...responsibilities];
    updated[index] = { text };
    onChange(updated);
  };

  const removeResponsibility = (index: number) => {
    onChange(responsibilities.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium">Key Responsibilities</label>
        <button
          type="button"
          onClick={addResponsibility}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Responsibility
        </button>
      </div>

      {responsibilities.length === 0 && (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">No responsibilities added yet</p>
      )}

      <div className="space-y-2">
        {responsibilities.map((responsibility, index) => (
          <div key={index} className="flex gap-2 items-start">
            <span className="text-zinc-500 dark:text-zinc-400 mt-2 flex-shrink-0">•</span>
            <input
              type="text"
              value={responsibility.text}
              onChange={(e) => updateResponsibility(index, e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
              placeholder="e.g. Lead the development of new features"
            />
            <button
              type="button"
              onClick={() => removeResponsibility(index)}
              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title="Remove responsibility"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
