/**
 * EducationForm Component
 * Collapsible form for editing a single education entry
 */

import React, { useState } from 'react';
import { Trash2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { EducationEntry } from '@/lib/shared/types';
import DatePicker from './DatePicker';

interface EducationFormProps {
  data: EducationEntry;
  onChange: (field: keyof EducationEntry, value: any) => void;
  onRemove: () => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
}

export default function EducationForm({ data, onChange, onRemove, fieldErrors = {}, disabled = false }: EducationFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Create display title
  const institution = data.school_name?.trim() || 'New Institution';
  const degree = data.degree?.trim() || 'Degree';
  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden shadow-sm">
      {/* Header - Always visible */}
      <div className="relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary-subtle transition-colors text-left"
        >
          <div className="flex-1 min-w-0 pr-16">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {institution}
              </span>
              {hasErrors && (
                <span className="flex items-center gap-1.5 text-xs text-warning">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">Needs update</span>
                </span>
              )}
            </div>
            <div className="text-xs text-muted truncate mt-0.5">
              {degree}
            </div>
          </div>
          
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted" />
            )}
          </div>
        </button>
        
        {/* Delete button - positioned absolutely to avoid nesting */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onRemove();
          }}
          className={`absolute right-12 top-1/2 -translate-y-1/2 p-1.5 text-error hover:bg-error-subtle rounded transition-colors ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title="Remove education"
        >
          <Trash2 className="w-4 h-4" />
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-primary-subtle space-y-4 bg-primary-subtle/30/10">
          {/* Two column layout for short fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Institution</label>
                {fieldErrors.school_name && (
                  <span className="flex items-center gap-1 text-xs text-warning">
                    <AlertCircle className="w-3 h-3" />
                    <span>{fieldErrors.school_name}</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={data.school_name}
                onChange={(e) => onChange('school_name', e.target.value)}
                placeholder="e.g., MIT"
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm rounded border ${
                  fieldErrors.school_name 
                    ? 'border-warning ring-1 ring-warning/50/50' 
                    : 'border-border'
                } bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Degree</label>
                {fieldErrors.degree && (
                  <span className="flex items-center gap-1 text-xs text-warning">
                    <AlertCircle className="w-3 h-3" />
                    <span>{fieldErrors.degree}</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={data.degree}
                onChange={(e) => onChange('degree', e.target.value)}
                placeholder="e.g., Bachelor of Science in CS"
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm rounded border ${
                  fieldErrors.degree 
                    ? 'border-warning ring-1 ring-warning/50/50' 
                    : 'border-border'
                } bg-white border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed`}
              />
            </div>

            <div>
              <DatePicker
                year={data.start_year}
                month={data.start_month}
                onYearChange={(value) => onChange('start_year', value)}
                onMonthChange={(value) => onChange('start_month', value)}
                label="Start Date"
                yearError={fieldErrors.start_year}
                monthError={fieldErrors.start_month}
                disabled={disabled}
              />
            </div>

            <div>
              <DatePicker
                year={data.end_year}
                month={data.end_month}
                onYearChange={(value) => onChange('end_year', value)}
                onMonthChange={(value) => onChange('end_month', value)}
                label="End Date"
                yearError={fieldErrors.end_year}
                monthError={fieldErrors.end_month}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Full width description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
            <textarea
              value={data.description || ''}
              onChange={(e) => onChange('description', e.target.value || null)}
              placeholder="e.g., GPA 3.8, Dean's List, relevant coursework..."
              rows={3}
              disabled={disabled}
              className="w-full px-3 py-2 text-sm rounded bg-white border border-border focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      )}
    </div>
  );
}
