/**
 * FormField Component
 * 
 * Reusable form field wrapper with label and error display.
 * Provides consistent styling across all forms.
 */

'use client';

import { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  id?: string;
  label: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export default function FormField({
  id,
  label,
  error,
  required,
  disabled,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
        </label>
        {error && (
          <span className="flex items-center gap-1 text-xs text-warning">
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// Standard input class helper
export const inputClassName = (hasError?: boolean, disabled?: boolean) =>
  `w-full px-3 py-2 text-sm rounded border ${
    hasError ? 'border-warning ring-1 ring-warning/50' : 'border-border'
  } bg-white focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none ${
    disabled ? 'opacity-60 cursor-not-allowed' : ''
  }`;

// Textarea class helper  
export const textareaClassName = (disabled?: boolean) =>
  `w-full px-3 py-2 text-sm rounded bg-white border border-border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none resize-none ${
    disabled ? 'opacity-60 cursor-not-allowed' : ''
  }`;
