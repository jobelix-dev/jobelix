/**
 * CertificationForm Component
 * Collapsible form for editing a single certification/award entry.
 * Uses shared CollapsibleSection and FormField components.
 */

'use client';

import { CertificationEntry } from '@/lib/shared/types';
import { CollapsibleSection, FormField, inputClassName } from '@/app/components/shared';

interface CertificationFormProps {
  data: CertificationEntry;
  onChange: (field: keyof CertificationEntry, value: CertificationEntry[keyof CertificationEntry]) => void;
  onRemove: () => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
  forceExpanded?: boolean;
  idPrefix?: string;
}

export default function CertificationForm({
  data,
  onChange,
  onRemove,
  fieldErrors = {},
  disabled = false,
  forceExpanded = false,
  idPrefix = 'certification'
}: CertificationFormProps) {
  const title = data.name?.trim() || 'New Certification/Award';
  const subtitle = data.issuing_organization?.trim();
  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <CollapsibleSection
      title={title}
      subtitle={subtitle}
      hasErrors={hasErrors}
      onRemove={onRemove}
      disabled={disabled}
      forceExpanded={forceExpanded}
      removeTitle="Remove certification"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <FormField id={`${idPrefix}-name`} label="Certification/Award Name" error={fieldErrors.name}>
          <input
            id={`${idPrefix}-name`}
            type="text"
            value={data.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="e.g., AWS Certified Solutions Architect"
            disabled={disabled}
            className={inputClassName(!!fieldErrors.name, disabled)}
          />
        </FormField>

        <div>
          <label className="block text-sm font-medium mb-1.5">Issuing Organization (optional)</label>
          <input
            type="text"
            value={data.issuing_organization || ''}
            onChange={(e) => onChange('issuing_organization', e.target.value || null)}
            placeholder="e.g., Amazon Web Services"
            disabled={disabled}
            className={inputClassName(false, disabled)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">URL (optional)</label>
        <input
          type="url"
          value={data.url || ''}
          onChange={(e) => onChange('url', e.target.value || null)}
          placeholder="https://..."
          disabled={disabled}
          className={inputClassName(false, disabled)}
        />
      </div>
    </CollapsibleSection>
  );
}
