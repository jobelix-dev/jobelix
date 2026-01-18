/**
 * LanguagesInput Component
 * Compact two-column language containers with proficiency dropdown
 */

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, AlertCircle, ChevronDown } from 'lucide-react';
import { LanguageEntry } from '@/lib/shared/types';

interface LanguagesInputProps {
  languages: LanguageEntry[];
  onChange: (languages: LanguageEntry[]) => void;
  fieldErrors?: Record<number, { language_name?: string; proficiency_level?: string }>;
  disabled?: boolean;
}

const proficiencyLevels: LanguageEntry['proficiency_level'][] = ['Beginner', 'Intermediate', 'Advanced', 'Fluent', 'Native'];

function CustomDropdown({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: LanguageEntry['proficiency_level']; 
  onChange: (value: LanguageEntry['proficiency_level']) => void; 
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="appearance-none bg-surface/50 text-default border border-primary-subtle hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary-subtle text-xs pr-7 pl-3 py-2 rounded-full disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer font-medium transition-all shadow-sm hover:shadow-md min-w-[110px] text-center"
      >
        {value}
      </button>
      <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      
      {isOpen && (
        <div className="absolute top-full mt-1 min-w-[110px] bg-surface border border-primary-subtle rounded-2xl shadow-lg overflow-hidden z-50 py-1">
          {proficiencyLevels.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => {
                onChange(level);
                setIsOpen(false);
              }}
              className={`w-full text-center px-3 py-2 text-xs font-medium transition-colors ${
                value === level
                  ? 'bg-primary-subtle/50 text-primary-hover'
                  : 'text-default hover:bg-primary-subtle'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LanguagesInput({ languages, onChange, fieldErrors = {}, disabled = false }: LanguagesInputProps) {
  const updateLanguage = (index: number, field: keyof LanguageEntry, value: string) => {
    const updated = [...languages];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeLanguage = (index: number) => {
    onChange(languages.filter((_, i) => i !== index));
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {languages.map((language, index) => {
        const nameError = fieldErrors[index]?.language_name;
        const proficiencyError = fieldErrors[index]?.proficiency_level;
        const hasError = nameError || proficiencyError;
        
        return (
          <div key={index} className="space-y-1">
            <div className="h-4">
              {(nameError || proficiencyError) && (
                <div className="flex items-center gap-1 text-xs text-warning px-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{nameError || proficiencyError}</span>
                </div>
              )}
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                hasError
                  ? 'border-warning ring-1 ring-warning/50'
                  : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30'
              } bg-white transition-colors`}
            >
              <input
                type="text"
                value={language.language_name}
                onChange={(e) => updateLanguage(index, 'language_name', e.target.value)}
                placeholder="e.g., English"
                disabled={disabled}
                className="flex-1 bg-transparent border-none focus:outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed min-w-0"
              />
              <CustomDropdown
                value={language.proficiency_level}
                onChange={(level) => updateLanguage(index, 'proficiency_level', level)}
                disabled={disabled}
              />
              <button
                onClick={() => removeLanguage(index)}
                disabled={disabled}
                className="p-1 text-error hover:bg-error-subtle rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
                title="Remove language"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
