/**
 * BasicInfoForm Component
 * 
 * Form for basic profile information (name, email, phone, address).
 * Uses FormField for consistent styling and PhoneInput for phone number handling.
 */

'use client';

import { FormField, inputClassName, PhoneInput } from '@/app/components/shared';
import { ExtractedResumeData } from '@/lib/shared/types';

interface BasicInfoFormProps {
  data: ExtractedResumeData;
  onUpdateField: (field: keyof ExtractedResumeData, value: unknown) => void;
  onUpdateFields: (updates: Partial<ExtractedResumeData>) => void;
  fieldErrors?: {
    student_name?: string;
    email?: string;
    phone_number?: string;
    address?: string;
  };
  disabled?: boolean;
}

export default function BasicInfoForm({
  data,
  onUpdateField,
  onUpdateFields,
  fieldErrors,
  disabled = false,
}: BasicInfoFormProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-base sm:text-lg font-semibold text-muted">Basic Information</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Name Field */}
        <FormField
          id="profile-student-name"
          label="Full Name"
          error={fieldErrors?.student_name}
          required
        >
          <input
            id="profile-student-name"
            type="text"
            value={(data.student_name as string) || ''}
            onChange={(e) => onUpdateField('student_name', e.target.value)}
            placeholder="e.g., John Doe"
            disabled={disabled}
            className={inputClassName(!!fieldErrors?.student_name, disabled)}
          />
        </FormField>

        {/* Email Field */}
        <FormField
          id="profile-email"
          label="Email"
          error={fieldErrors?.email}
          required
        >
          <input
            id="profile-email"
            type="email"
            value={(data.email as string) || ''}
            onChange={(e) => onUpdateField('email', e.target.value)}
            placeholder="your.email@example.com"
            disabled={disabled}
            className={inputClassName(!!fieldErrors?.email, disabled)}
          />
        </FormField>

        {/* Phone Field */}
        <FormField
          id="profile-phone-number"
          label="Phone Number"
          error={fieldErrors?.phone_number}
          required
        >
          <PhoneInput
            id="profile-phone-number"
            phoneValue={data.phone_number}
            countryCode={data.phone_country_code}
            onPhoneChange={(phone) => onUpdateField('phone_number', phone)}
            onCountryChange={(country) => onUpdateField('phone_country_code', country)}
            error={fieldErrors?.phone_number}
            disabled={disabled}
          />
        </FormField>

        {/* Address Field */}
        <FormField
          id="profile-address"
          label="Address"
          error={fieldErrors?.address}
          required
        >
          <input
            id="profile-address"
            type="text"
            value={(data.address as string) || ''}
            onChange={(e) => onUpdateField('address', e.target.value)}
            placeholder="City, Country"
            disabled={disabled}
            className={inputClassName(!!fieldErrors?.address, disabled)}
          />
        </FormField>
      </div>
    </div>
  );
}
