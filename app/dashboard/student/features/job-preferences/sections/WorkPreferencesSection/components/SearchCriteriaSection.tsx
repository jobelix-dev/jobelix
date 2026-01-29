/**
 * SearchCriteriaSection Component
 * 
 * Section for essential job search criteria (positions, locations)
 */

'use client';

import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { Target, MapPin } from 'lucide-react';
import ArrayInputField, { ArrayInputFieldRef } from './ArrayInputField';

interface SearchCriteriaSectionProps {
  positions: string[];
  locations: string[];
  remoteWork?: boolean; // Deprecated - kept for backward compatibility but no longer used
  onChange: (field: string, value: string[] | boolean) => void;
  errors?: {
    positions?: boolean;
    locations?: boolean;
  };
  positionsInputId?: string;
  locationsInputId?: string;
  positionsAddButtonId?: string;
  locationsAddButtonId?: string;
}

export interface SearchCriteriaSectionRef {
  flushAllPendingInputs: () => void;
  getPendingInputs: () => { positions: string; locations: string };
}

const SearchCriteriaSection = forwardRef<SearchCriteriaSectionRef, SearchCriteriaSectionProps>((
  {
    positions,
    locations,
    // remoteWork is no longer used - remote filter disabled
    onChange,
    errors,
    positionsInputId,
    locationsInputId,
    positionsAddButtonId,
    locationsAddButtonId,
  },
  ref
) => {
  const positionsRef = useRef<ArrayInputFieldRef>(null);
  const locationsRef = useRef<ArrayInputFieldRef>(null);

  // Expose flush and get methods to parent
  useImperativeHandle(ref, () => ({
    flushAllPendingInputs: () => {
      positionsRef.current?.flushPendingInput();
      locationsRef.current?.flushPendingInput();
    },
    getPendingInputs: () => ({
      positions: positionsRef.current?.getPendingInput() || '',
      locations: locationsRef.current?.getPendingInput() || '',
    }),
  }));

  return (
    <div className="space-y-4">
      <ArrayInputField
        ref={positionsRef}
        label="Target Positions"
        placeholder="e.g., Software Engineer, Data Analyst"
        value={positions}
        onChange={(val) => onChange('positions', val)}
        icon={<Target className="w-4 h-4" />}
        tagColorClass="bg-primary-subtle/30 text-primary-hover"
        hasError={errors?.positions}
        inputId={positionsInputId}
        addButtonId={positionsAddButtonId}
      />

      <ArrayInputField
        ref={locationsRef}
        label="Locations"
        placeholder="e.g., San Francisco, Remote, United States"
        value={locations}
        onChange={(val) => onChange('locations', val)}
        icon={<MapPin className="w-4 h-4" />}
        tagColorClass="bg-primary-subtle/30 text-primary-hover"
        hasError={errors?.locations}
        inputId={locationsInputId}
        addButtonId={locationsAddButtonId}
      />

      {/* Remote filter removed - it limits job results too much.
          Bot now searches all jobs (on-site, hybrid, remote) by default. */}
    </div>
  );
});

SearchCriteriaSection.displayName = 'SearchCriteriaSection';

export default SearchCriteriaSection;
