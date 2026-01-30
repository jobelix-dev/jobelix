/**
 * EducationForm Component
 * Collapsible form for editing a single education entry.
 * Uses shared CollapsibleSection and FormField components.
 */

'use client';

import { EducationEntry } from '@/lib/shared/types';
import { CollapsibleSection, FormField, inputClassName, textareaClassName } from '@/app/components/shared';
import DatePicker from './DatePicker';

interface EducationFormProps {
  data: EducationEntry;
  onChange: (field: keyof EducationEntry, value: unknown) => void;
  onRemove: () => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
  forceExpanded?: boolean;
  idPrefix?: string;
}

export default function EducationForm({
  data,
  onChange,
  onRemove,
  fieldErrors = {},
  disabled = false,
  forceExpanded = false,
  idPrefix = 'education'
}: EducationFormProps) {
  const title = data.school_name?.trim() || 'New Institution';
  const subtitle = data.degree?.trim() || 'Degree';
  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <CollapsibleSection
      title={title}
      subtitle={subtitle}
      hasErrors={hasErrors}
      onRemove={onRemove}
      disabled={disabled}
      forceExpanded={forceExpanded}
      removeTitle="Remove education"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <FormField id={`${idPrefix}-school_name`} label="Institution" error={fieldErrors.school_name}>
          <input
            id={`${idPrefix}-school_name`}
            type="text"
            value={data.school_name}
            onChange={(e) => onChange('school_name', e.target.value)}
            placeholder="e.g., MIT"
            disabled={disabled}
            className={inputClassName(!!fieldErrors.school_name, disabled)}
          />
        </FormField>

        <FormField id={`${idPrefix}-degree`} label="Degree" error={fieldErrors.degree}>
          <input
            id={`${idPrefix}-degree`}
            type="text"
            value={data.degree}
            onChange={(e) => onChange('degree', e.target.value)}
            placeholder="e.g., Bachelor of Science in CS"
            disabled={disabled}
            className={inputClassName(!!fieldErrors.degree, disabled)}
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
          placeholder="e.g., GPA 3.8, Dean's List, relevant coursework..."
          rows={3}
          disabled={disabled}
          className={textareaClassName(disabled)}
        />
      </div>
    </CollapsibleSection>
  );
}
