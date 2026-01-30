/**
 * ExperienceForm Component
 * Collapsible form for editing a single work experience entry.
 * Uses shared CollapsibleSection and FormField components.
 */

'use client';

import { ExperienceEntry } from '@/lib/shared/types';
import { CollapsibleSection, FormField, inputClassName, textareaClassName } from '@/app/components/shared';
import DatePicker from './DatePicker';

interface ExperienceFormProps {
  data: ExperienceEntry;
  onChange: (field: keyof ExperienceEntry, value: unknown) => void;
  onRemove: () => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
  forceExpanded?: boolean;
  idPrefix?: string;
}

export default function ExperienceForm({
  data,
  onChange,
  onRemove,
  fieldErrors = {},
  disabled = false,
  forceExpanded = false,
  idPrefix = 'experience'
}: ExperienceFormProps) {
  const title = data.organisation_name?.trim() || 'New Organization';
  const subtitle = data.position_name?.trim() || 'Position';
  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <CollapsibleSection
      title={title}
      subtitle={subtitle}
      hasErrors={hasErrors}
      onRemove={onRemove}
      disabled={disabled}
      forceExpanded={forceExpanded}
      removeTitle="Remove experience"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <FormField id={`${idPrefix}-organisation_name`} label="Organization" error={fieldErrors.organisation_name}>
          <input
            id={`${idPrefix}-organisation_name`}
            type="text"
            value={data.organisation_name}
            onChange={(e) => onChange('organisation_name', e.target.value)}
            placeholder="e.g., Google"
            disabled={disabled}
            className={inputClassName(!!fieldErrors.organisation_name, disabled)}
          />
        </FormField>

        <FormField id={`${idPrefix}-position_name`} label="Position" error={fieldErrors.position_name}>
          <input
            id={`${idPrefix}-position_name`}
            type="text"
            value={data.position_name}
            onChange={(e) => onChange('position_name', e.target.value)}
            placeholder="e.g., Software Engineer"
            disabled={disabled}
            className={inputClassName(!!fieldErrors.position_name, disabled)}
          />
        </FormField>

        <DatePicker
          year={data.start_year}
          month={data.start_month}
          onYearChange={(value) => onChange('start_year', value)}
          onMonthChange={(value) => onChange('start_month', value)}
          label="Start Date"
          yearError={fieldErrors.start_year}
          monthError={fieldErrors.start_month}
          disabled={disabled}
          monthId={`${idPrefix}-start_month`}
          yearId={`${idPrefix}-start_year`}
        />

        <DatePicker
          year={data.end_year}
          month={data.end_month}
          onYearChange={(value) => onChange('end_year', value)}
          onMonthChange={(value) => onChange('end_month', value)}
          label="End Date"
          yearError={fieldErrors.end_year}
          monthError={fieldErrors.end_month}
          disabled={disabled}
          monthId={`${idPrefix}-end_month`}
          yearId={`${idPrefix}-end_year`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
        <textarea
          value={data.description || ''}
          onChange={(e) => onChange('description', e.target.value || null)}
          placeholder="Key responsibilities and achievements..."
          rows={3}
          disabled={disabled}
          className={textareaClassName(disabled)}
        />
      </div>
    </CollapsibleSection>
  );
}
