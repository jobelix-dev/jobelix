/**
 * CapabilitiesInput Component
 * 
 * Manages array of desired capabilities/traits
 */

'use client';

import { OfferCapabilityEntry } from '@/lib/types';

interface CapabilitiesInputProps {
  capabilities: OfferCapabilityEntry[];
  onChange: (capabilities: OfferCapabilityEntry[]) => void;
}

export default function CapabilitiesInput({ capabilities, onChange }: CapabilitiesInputProps) {
  const addCapability = () => {
    onChange([...capabilities, { text: '', importance: 'must' }]);
  };

  const updateCapability = (index: number, field: keyof OfferCapabilityEntry, value: any) => {
    const updated = [...capabilities];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeCapability = (index: number) => {
    onChange(capabilities.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Desired Capabilities</h3>
        <button
          type="button"
          onClick={addCapability}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Capability
        </button>
      </div>

      {capabilities.length === 0 && (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">No capabilities added yet. Click "Add Capability" to start.</p>
      )}

      <div className="space-y-2">
        {capabilities.map((capability, index) => (
          <div key={index} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="flex gap-2 items-start mb-2">
              <span className="text-zinc-500 dark:text-zinc-400 mt-2 flex-shrink-0">•</span>
              <input
                type="text"
                value={capability.text}
                onChange={(e) => updateCapability(index, 'text', e.target.value)}
                className="flex-1 px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                placeholder="e.g. Strong communication skills"
              />
            </div>
            <div className="flex gap-2 items-center ml-4">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Importance:</label>
              <select
                value={capability.importance}
                onChange={(e) => updateCapability(index, 'importance', e.target.value as 'must' | 'nice')}
                className="px-3 py-1 border border-zinc-200 dark:border-zinc-700 rounded focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              >
                <option value="must">Required</option>
                <option value="nice">Nice to Have</option>
              </select>
              <button
                type="button"
                onClick={() => removeCapability(index)}
                className="ml-auto text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 text-sm transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
