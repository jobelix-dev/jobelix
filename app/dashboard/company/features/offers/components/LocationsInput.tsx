/**
 * LocationsInput Component
 * 
 * Manages array of work locations for the offer
 */

'use client';

import { Plus, Trash2 } from 'lucide-react';
import { OfferLocationEntry } from '@/lib/shared/types';

interface LocationsInputProps {
  locations: OfferLocationEntry[];
  onChange: (locations: OfferLocationEntry[]) => void;
}

export default function LocationsInput({ locations, onChange }: LocationsInputProps) {
  const addLocation = () => {
    onChange([
      ...locations,
      {
        city: null,
        country: null,
      },
    ]);
  };

  const updateLocation = (index: number, field: keyof OfferLocationEntry, value: any) => {
    const updated = [...locations];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeLocation = (index: number) => {
    onChange(locations.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium">Work Locations</label>
        <button
          type="button"
          onClick={addLocation}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-surface hover:bg-primary-subtle rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {locations.length === 0 && (
        <p className="text-muted text-sm text-center py-4">No locations added yet</p>
      )}

      <div className="space-y-2">
        {locations.map((location, index) => (
          <div key={index} className="flex gap-2 items-start">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input
                type="text"
                value={location.city || ''}
                onChange={(e) => updateLocation(index, 'city', e.target.value || null)}
                className="px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                placeholder="City"
              />
              <input
                type="text"
                value={location.country || ''}
                onChange={(e) => updateLocation(index, 'country', e.target.value || null)}
                className="px-3 py-2 text-sm border border-border rounded bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                placeholder="Country"
              />
            </div>
            <button
              type="button"
              onClick={() => removeLocation(index)}
              className="p-1.5 text-error hover:bg-error-subtle rounded transition-colors"
              title="Remove location"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
