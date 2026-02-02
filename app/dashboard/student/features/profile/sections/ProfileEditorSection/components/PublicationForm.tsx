/**
 * PublicationForm Component
 * Collapsible form for editing a single publication entry.
 * Uses shared CollapsibleSection and FormField components.
 */

'use client';

import { PublicationEntry } from '@/lib/shared/types';
import { CollapsibleSection, FormField, inputClassName, textareaClassName } from '@/app/components/shared';
import DatePicker from './DatePicker';

interface PublicationFormProps {
  data: PublicationEntry;
  onChange: (field: keyof PublicationEntry, value: PublicationEntry[keyof PublicationEntry]) => void;
  onRemove: () => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
  forceExpanded?: boolean;
  idPrefix?: string;
}

export default function PublicationForm({
  data,
  onChange,
  onRemove,
  fieldErrors = {},
  disabled = false,
  forceExpanded = false,
  idPrefix = 'publication'
}: PublicationFormProps) {
  const title = data.title?.trim() || 'New Publication';
  const subtitle = data.journal_name?.trim();
  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <CollapsibleSection
      title={title}
      subtitle={subtitle}
      hasErrors={hasErrors}
      onRemove={onRemove}
      disabled={disabled}
      forceExpanded={forceExpanded}
      removeTitle="Remove publication"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <FormField id={`${idPrefix}-title`} label="Title" error={fieldErrors.title}>
          <input
            id={`${idPrefix}-title`}
            type="text"
            value={data.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="e.g., Machine Learning in Healthcare"
            disabled={disabled}
            className={inputClassName(!!fieldErrors.title, disabled)}
          />
        </FormField>

        <div>
          <label className="block text-sm font-medium mb-1.5">Journal/Conference (optional)</label>
          <input
            type="text"
            value={data.journal_name || ''}
            onChange={(e) => onChange('journal_name', e.target.value || null)}
            placeholder="e.g., IEEE Transactions"
            disabled={disabled}
            className={inputClassName(false, disabled)}
          />
        </div>

        <DatePicker
          year={data.publication_year}
          month={data.publication_month}
          onYearChange={(value) => onChange('publication_year', value)}
          onMonthChange={(value) => onChange('publication_month', value)}
          label="Publication Date (optional)"
          yearError={fieldErrors.publication_year}
          monthError={fieldErrors.publication_month}
          disabled={disabled}
          monthId={`${idPrefix}-publication_month`}
          yearId={`${idPrefix}-publication_year`}
        />

        <div>
          <label className="block text-sm font-medium mb-1.5">Link (optional)</label>
          <input
            type="url"
            value={data.link || ''}
            onChange={(e) => onChange('link', e.target.value || null)}
            placeholder="https://doi.org/..."
            disabled={disabled}
            className={inputClassName(false, disabled)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
        <textarea
          value={data.description || ''}
          onChange={(e) => onChange('description', e.target.value || null)}
          placeholder="Brief abstract or summary..."
          rows={3}
          disabled={disabled}
          className={textareaClassName(disabled)}
        />
      </div>
    </CollapsibleSection>
  );
}
