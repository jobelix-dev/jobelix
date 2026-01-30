/**
 * CapabilitiesInput Component
 * 
 * Manages array of desired capabilities using SimpleArrayInput.
 */

'use client';

import { SimpleArrayInput } from '@/app/components/shared';
import { OfferCapabilityEntry } from '@/lib/shared/types';

interface CapabilitiesInputProps {
  capabilities: OfferCapabilityEntry[];
  onChange: (capabilities: OfferCapabilityEntry[]) => void;
}

export default function CapabilitiesInput({ capabilities, onChange }: CapabilitiesInputProps) {
  return (
    <SimpleArrayInput
      label="Desired Capabilities"
      items={capabilities}
      onChange={onChange}
      createItem={() => ({ text: '', importance: 'must' as const })}
      emptyMessage="No capabilities added yet"
      addButtonText="Add Capability"
      renderItem={(item, _index, updateItem) => (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={item.text}
            onChange={(e) => updateItem({ ...item, text: e.target.value })}
            className="flex-1 px-3 py-2 text-sm border border-border rounded bg-white focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            placeholder="e.g. Strong communication skills"
          />
          <select
            value={item.importance}
            onChange={(e) => updateItem({ ...item, importance: e.target.value as 'must' | 'nice' })}
            className="flex-1 sm:flex-none sm:w-32 px-3 py-2 text-sm border border-border rounded bg-white focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          >
            <option value="must">Required</option>
            <option value="nice">Nice to Have</option>
          </select>
        </div>
      )}
    />
  );
}
