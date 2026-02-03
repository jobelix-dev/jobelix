/**
 * BasicInfoForm Component
 * 
 * Form for basic profile information (name, email, phone, address).
 * Uses FormField for consistent styling and validation display.
 */

'use client';

import { FormField, inputClassName } from '@/app/components/shared';
import { ExtractedResumeData } from '@/lib/shared/types';

interface BasicInfoFormProps {
  data: ExtractedResumeData;
  onUpdateField: (field: keyof ExtractedResumeData, value: string) => void;
  fieldErrors?: {
    student_name?: string;
    email?: string;
    phone_number?: string;
    address?: string;
  };
  disabled?: boolean;
}

interface FieldConfig {
  key: keyof ExtractedResumeData;
  label: string;
  type: string;
  placeholder: string;
  errorKey: 'student_name' | 'email' | 'phone_number' | 'address';
  required?: boolean;
}

const FIELDS: FieldConfig[] = [
  {
    key: 'student_name',
    label: 'Full Name',
    type: 'text',
    placeholder: 'Enter your name',
    errorKey: 'student_name',
    required: true,
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'your.email@example.com',
    errorKey: 'email',
    required: true,
  },
  {
    key: 'phone_number',
    label: 'Phone Number',
    type: 'tel',
    placeholder: '+1 (555) 123-4567',
    errorKey: 'phone_number',
    required: true,
  },
  {
    key: 'address',
    label: 'Address',
    type: 'text',
    placeholder: 'City, Country',
    errorKey: 'address',
    required: true,
  },
];

export default function BasicInfoForm({
  data,
  onUpdateField,
  fieldErrors,
  disabled = false,
}: BasicInfoFormProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-base sm:text-lg font-semibold text-muted">Basic Information</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {FIELDS.map((field) => {
          const error = fieldErrors?.[field.errorKey];
          const value = (data[field.key] as string) || '';
          
          return (
            <FormField
              key={field.key}
              id={`profile-${field.key.replace('_', '-')}`}
              label={field.label}
              error={error}
              required={field.required}
            >
              <input
                id={`profile-${field.key.replace('_', '-')}`}
                type={field.type}
                value={value}
                onChange={(e) => onUpdateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                disabled={disabled}
                className={inputClassName(!!error, disabled)}
              />
            </FormField>
          );
        })}
      </div>
    </div>
  );
}
