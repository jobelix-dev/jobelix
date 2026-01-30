/**
 * PerksInput Component
 * 
 * Manages array of perks and benefits using SimpleArrayInput.
 */

'use client';

import { SimpleArrayInput } from '@/app/components/shared';
import { OfferPerkEntry } from '@/lib/shared/types';

interface PerksInputProps {
  perks: OfferPerkEntry[];
  onChange: (perks: OfferPerkEntry[]) => void;
}

export default function PerksInput({ perks, onChange }: PerksInputProps) {
  return (
    <SimpleArrayInput
      label="Perks & Benefits"
      items={perks}
      onChange={onChange}
      createItem={() => ({ text: '' })}
      emptyMessage="No perks added yet"
      addButtonText="Add Perk"
      bulletStyle="check"
      renderItem={(item, _index, updateItem) => (
        <input
          type="text"
          value={item.text}
          onChange={(e) => updateItem({ text: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-white focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          placeholder="e.g. Remote work flexibility"
        />
      )}
    />
  );
}
