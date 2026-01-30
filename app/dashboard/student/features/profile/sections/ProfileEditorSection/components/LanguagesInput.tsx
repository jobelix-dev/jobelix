/**
 * LanguagesInput Component
 * Responsive language cards with proficiency dropdown
 */

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, AlertCircle, ChevronDown } from 'lucide-react';
import { LanguageEntry } from '@/lib/shared/types';

interface LanguagesInputProps {
  languages: LanguageEntry[];
  onChange: (languages: LanguageEntry[]) => void;
  fieldErrors?: Record<number, { language_name?: string; proficiency_level?: string }>;
  disabled?: boolean;
  idPrefix?: string;
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
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 bg-primary-subtle/30 text-default border border-transparent hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs px-3 py-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer font-medium transition-all"
      >
        <span>{value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border/50 rounded-lg shadow-lg overflow-hidden z-50 py-1">
          {proficiencyLevels.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => {
                onChange(level);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                value === level
                  ? 'bg-primary-subtle text-primary'
                  : 'text-default hover:bg-primary-subtle/50'
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

export default function LanguagesInput({
  languages,
  onChange,
  fieldErrors = {},
  disabled = false,
  idPrefix = 'profile-language'
}: LanguagesInputProps) {
  const updateLanguage = (index: number, field: keyof LanguageEntry, value: string) => {
    const updated = [...languages];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeLanguage = (index: number) => {
    onChange(languages.filter((_, i) => i !== index));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {languages.map((language, index) => {
        const nameError = fieldErrors[index]?.language_name;
        const proficiencyError = fieldErrors[index]?.proficiency_level;
        const hasError = nameError || proficiencyError;
        
        return (
          <div 
            key={index} 
            className={`relative p-3 rounded-xl border bg-white transition-all ${
              hasError
                ? 'border-warning ring-1 ring-warning/30'
                : 'border-border/50 hover:border-border'
            }`}
          >
            {/* Error message */}
            {(nameError || proficiencyError) && (
              <div className="flex items-center gap-1.5 text-xs text-warning mb-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{nameError || proficiencyError}</span>
              </div>
            )}
            
            {/* Language name input */}
            <div className="mb-2">
              <input
                id={`${idPrefix}-${index}-language_name`}
                type="text"
                value={language.language_name}
                onChange={(e) => updateLanguage(index, 'language_name', e.target.value)}
                placeholder="e.g., English"
                disabled={disabled}
                className="w-full bg-transparent border-none focus:outline-none text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-muted/50"
              />
            </div>
            
            {/* Bottom row: proficiency + delete */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <CustomDropdown
                  value={language.proficiency_level}
                  onChange={(level) => updateLanguage(index, 'proficiency_level', level)}
                  disabled={disabled}
                />
              </div>
              <button
                type="button"
                onClick={() => removeLanguage(index)}
                disabled={disabled}
                className="p-2 text-muted hover:text-error hover:bg-error-subtle rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
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
