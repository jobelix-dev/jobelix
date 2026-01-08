/**
 * LocationsInput Component
 * 
 * Manages array of work locations for the offer
 */

'use client';

import { OfferLocationEntry } from '@/lib/types';

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
        region: null,
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Work Locations</h3>
        <button
          type="button"
          onClick={addLocation}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Location
        </button>
      </div>

      {locations.length === 0 && (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">No locations added yet. Click "Add Location" to start.</p>
      )}

      <div className="space-y-3">
        {locations.map((location, index) => (
          <div key={index} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">City</label>
                <input
                  type="text"
                  value={location.city || ''}
                  onChange={(e) => updateLocation(index, 'city', e.target.value || null)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  placeholder="e.g. Paris"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Country</label>
                <input
                  type="text"
                  value={location.country || ''}
                  onChange={(e) => updateLocation(index, 'country', e.target.value || null)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  placeholder="e.g. France"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Region (optional)</label>
                <input
                  type="text"
                  value={location.region || ''}
                  onChange={(e) => updateLocation(index, 'region', e.target.value || null)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  placeholder="e.g. Île-de-France"
                />
              </div>
            </div>

            <div className="flex justify-end items-center">
              <button
                type="button"
                onClick={() => removeLocation(index)}
                className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 text-sm transition-colors"
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
