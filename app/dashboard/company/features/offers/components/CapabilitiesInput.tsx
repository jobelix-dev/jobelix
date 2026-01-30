/**
 * CapabilitiesInput Component
 * 
 * Manages array of desired capabilities/traits
 */

'use client';

import { Plus, Trash2 } from 'lucide-react';
import { OfferCapabilityEntry } from '@/lib/shared/types';

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
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium">Desired Capabilities</label>
        <button
          type="button"
          onClick={addCapability}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-surface hover:bg-primary-subtle rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Capability
        </button>
      </div>

      {capabilities.length === 0 && (
        <p className="text-muted text-sm text-center py-4">No capabilities added yet</p>
      )}

      <div className="space-y-2">
        {capabilities.map((capability, index) => (
          <div key={index} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={capability.text}
              onChange={(e) => updateCapability(index, 'text', e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              placeholder="e.g. Strong communication skills"
            />
            <div className="flex gap-2">
              <select
                value={capability.importance}
                onChange={(e) => updateCapability(index, 'importance', e.target.value as 'must' | 'nice')}
                className="flex-1 sm:flex-none sm:w-32 px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              >
                <option value="must">Required</option>
                <option value="nice">Nice to Have</option>
              </select>
              <button
                type="button"
                onClick={() => removeCapability(index)}
                className="p-2 sm:p-1.5 text-error hover:bg-error-subtle rounded transition-colors"
                title="Remove capability"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
