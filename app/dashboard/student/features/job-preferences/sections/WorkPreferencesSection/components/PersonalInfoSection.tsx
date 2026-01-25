/**
 * PersonalInfoSection Component
 * 
 * Section for personal details used in job applications
 */

'use client';

import React from 'react';
import { AlertCircle, User } from 'lucide-react';

interface PersonalInfoSectionProps {
  values: {
    date_of_birth: string;
    pronouns: string;
    gender: string;
    ethnicity: string;
    is_veteran: boolean;
    has_disability: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
  errors?: {
    date_of_birth?: boolean;
    pronouns?: boolean;
    gender?: boolean;
    ethnicity?: boolean;
  };
  dateOfBirthId?: string;
  pronounsId?: string;
  genderId?: string;
  ethnicityId?: string;
}

export default function PersonalInfoSection({
  values,
  onChange,
  errors,
  dateOfBirthId,
  pronounsId,
  genderId,
  ethnicityId,
}: PersonalInfoSectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-primary-hover flex items-center gap-2">
        <User className="w-4 h-4" />
        Personal Information
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-muted">
            Date of Birth
            {errors?.date_of_birth && <AlertCircle className="w-4 h-4 text-warning" />}
          </label>
          <input
            id={dateOfBirthId}
            type="date"
            value={values.date_of_birth || ''}
            onChange={(e) => onChange('date_of_birth', e.target.value)}
            className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-default focus:ring-2 focus:outline-none transition-colors ${
              errors?.date_of_birth
                ? 'border-warning focus:border-warning focus:ring-warning/30'
                : 'border-border focus:border-primary focus:ring-primary/30'
            }`}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-muted">
            Pronouns
            {errors?.pronouns && <AlertCircle className="w-4 h-4 text-warning" />}
          </label>
          <input
            id={pronounsId}
            type="text"
            value={values.pronouns || ''}
            onChange={(e) => onChange('pronouns', e.target.value)}
            placeholder="e.g., he/him, she/her"
            className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-default focus:ring-2 focus:outline-none transition-colors ${
              errors?.pronouns
                ? 'border-warning focus:border-warning focus:ring-warning/30'
                : 'border-border focus:border-primary focus:ring-primary/30'
            }`}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-muted">
            Gender
            {errors?.gender && <AlertCircle className="w-4 h-4 text-warning" />}
          </label>
          <input
            id={genderId}
            type="text"
            value={values.gender || ''}
            onChange={(e) => onChange('gender', e.target.value)}
            placeholder="e.g., Male, Female"
            className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-default focus:ring-2 focus:outline-none transition-colors ${
              errors?.gender
                ? 'border-warning focus:border-warning focus:ring-warning/30'
                : 'border-border focus:border-primary focus:ring-primary/30'
            }`}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-muted">
            Ethnicity
            {errors?.ethnicity && <AlertCircle className="w-4 h-4 text-warning" />}
          </label>
          <input
            id={ethnicityId}
            type="text"
            value={values.ethnicity || ''}
            onChange={(e) => onChange('ethnicity', e.target.value)}
            placeholder="Optional"
            className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-default focus:ring-2 focus:outline-none transition-colors ${
              errors?.ethnicity
                ? 'border-warning focus:border-warning focus:ring-warning/30'
                : 'border-border focus:border-primary focus:ring-primary/30'
            }`}
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.is_veteran}
            onChange={(e) => onChange('is_veteran', e.target.checked)}
            className="w-4 h-4 text-primary bg-white border border-border rounded focus:ring-2 focus:ring-primary transition-colors cursor-pointer"
          />
          <span className="text-sm text-muted group-hover:text-primary-hover transition-colors">
            I am a veteran
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={values.has_disability}
            onChange={(e) => onChange('has_disability', e.target.checked)}
            className="w-4 h-4 text-primary bg-white border border-border rounded focus:ring-2 focus:ring-primary transition-colors cursor-pointer"
          />
          <span className="text-sm text-muted group-hover:text-primary-hover transition-colors">
            I have a disability
          </span>
        </label>
      </div>
    </div>
  );
}
