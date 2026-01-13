/**
 * LanguagesInput Component
 * Compact two-column language containers with proficiency dropdown
 */

import React from 'react';
import { Trash2, AlertCircle, ChevronDown } from 'lucide-react';
import { LanguageEntry } from '@/lib/shared/types';

interface LanguagesInputProps {
  languages: LanguageEntry[];
  onChange: (languages: LanguageEntry[]) => void;
  fieldErrors?: Record<number, { language_name?: string; proficiency_level?: string }>;
  disabled?: boolean;
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
              <div className="relative flex-shrink-0">
                <select
                  value={language.proficiency_level}
                  onChange={(e) => updateLanguage(index, 'proficiency_level', e.target.value as LanguageEntry['proficiency_level'])}
                  disabled={disabled}
                  className="appearance-none bg-white dark:bg-zinc-800 border-none focus:outline-none text-xs pr-5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer text-zinc-600 dark:text-zinc-400 rounded px-2 py-1"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Fluent">Fluent</option>
                  <option value="Native">Native</option>
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-zinc-400" />
              </div>
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
