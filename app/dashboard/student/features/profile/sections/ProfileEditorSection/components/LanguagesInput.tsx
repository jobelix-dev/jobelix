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
        className="appearance-none bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 border border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 text-xs pr-7 pl-3 py-2 rounded-full disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer font-medium transition-all shadow-sm hover:shadow-md min-w-[110px] text-center"
      >
        {value}
      </button>
      <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-purple-600 dark:text-purple-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      
      {isOpen && (
        <div className="absolute top-full mt-1 min-w-[110px] bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-800 rounded-2xl shadow-lg overflow-hidden z-50 py-1">
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
                  ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                  : 'text-zinc-900 dark:text-zinc-100 hover:bg-purple-50 dark:hover:bg-purple-900/20'
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
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500 px-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{nameError || proficiencyError}</span>
                </div>
              )}
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                hasError
                  ? 'border-amber-500 dark:border-amber-600 ring-1 ring-amber-500/50 dark:ring-amber-600/50'
                  : 'border-purple-200 dark:border-purple-800'
              } bg-purple-50/30 dark:bg-purple-900/10`}
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
                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
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
