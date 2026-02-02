/**
 * LocationsInput Component
 * 
 * Manages array of work locations using SimpleArrayInput.
 */

'use client';

import { SimpleArrayInput } from '@/app/components/shared';
import { OfferLocationEntry } from '@/lib/shared/types';

interface LocationsInputProps {
  locations: OfferLocationEntry[];
  onChange: (locations: OfferLocationEntry[]) => void;
}

export default function LocationsInput({ locations, onChange }: LocationsInputProps) {
  return (
    <SimpleArrayInput
      label="Work Locations"
      items={locations}
      onChange={onChange}
      createItem={() => ({ city: null, country: null })}
      emptyMessage="No locations added yet"
      addButtonText="Add"
      renderItem={(item, _index, updateItem) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={item.city || ''}
            onChange={(e) => updateItem({ ...item, city: e.target.value || null })}
            className="px-3 py-2 text-sm border border-border rounded bg-white focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            placeholder="City"
          />
          <input
            type="text"
            value={item.country || ''}
            onChange={(e) => updateItem({ ...item, country: e.target.value || null })}
            className="px-3 py-2 text-sm border border-border rounded bg-white focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            placeholder="Country"
          />
        </div>
      )}
    />
  );
}
