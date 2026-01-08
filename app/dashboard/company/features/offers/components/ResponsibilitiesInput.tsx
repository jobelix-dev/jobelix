/**
 * ResponsibilitiesInput Component
 * 
 * Manages array of key responsibilities for the role
 */

'use client';

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Key Responsibilities</h3>
        <button
          type="button"
          onClick={addResponsibility}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Responsibility
        </button>
      </div>

      {responsibilities.length === 0 && (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">No responsibilities added yet. Click "Add Responsibility" to start.</p>
      )}

      <div className="space-y-2">
        {responsibilities.map((responsibility, index) => (
          <div key={index} className="flex gap-2 items-start">
            <span className="text-zinc-500 dark:text-zinc-400 mt-2 flex-shrink-0">•</span>
            <input
              type="text"
              value={responsibility.text}
              onChange={(e) => updateResponsibility(index, e.target.value)}
              className="flex-1 px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              placeholder="e.g. Lead the development of new features"
            />
            <button
              type="button"
              onClick={() => removeResponsibility(index)}
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
