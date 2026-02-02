/**
 * ResponsibilitiesInput Component
 * 
 * Manages array of key responsibilities using SimpleArrayInput.
 */

'use client';

import { SimpleArrayInput } from '@/app/components/shared';
import { OfferResponsibilityEntry } from '@/lib/shared/types';

interface ResponsibilitiesInputProps {
  responsibilities: OfferResponsibilityEntry[];
  onChange: (responsibilities: OfferResponsibilityEntry[]) => void;
}

export default function ResponsibilitiesInput({ responsibilities, onChange }: ResponsibilitiesInputProps) {
  return (
    <SimpleArrayInput
      label="Key Responsibilities"
      items={responsibilities}
      onChange={onChange}
      createItem={() => ({ text: '' })}
      emptyMessage="No responsibilities added yet"
      addButtonText="Add Responsibility"
      bulletStyle="bullet"
      renderItem={(item, _index, updateItem) => (
        <input
          type="text"
          value={item.text}
          onChange={(e) => updateItem({ text: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-white focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          placeholder="e.g. Lead the development of new features"
        />
      )}
    />
  );
}
