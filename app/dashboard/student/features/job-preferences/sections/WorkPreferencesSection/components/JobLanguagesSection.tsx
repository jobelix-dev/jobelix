/**
 * JobLanguagesSection Component
 * 
 * Section for selecting which languages the user can read job postings in.
 * Jobs in other languages will be skipped during auto-apply.
 */

'use client';

import React from 'react';
import { Languages, X, Plus } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../constants';

interface JobLanguagesSectionProps {
  value: string[];
  onChange: (value: string[]) => void;
  tourId?: string;
}

export default function JobLanguagesSection({
  value,
  onChange,
  tourId,
}: JobLanguagesSectionProps) {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddLanguage = (code: string) => {
    if (!value.includes(code)) {
      onChange([...value, code]);
    }
    setIsDropdownOpen(false);
  };

  const handleRemoveLanguage = (code: string) => {
    onChange(value.filter((c) => c !== code));
  };

  const getLanguageName = (code: string): string => {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    return lang?.name || code.toUpperCase();
  };

  const availableLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) => !value.includes(lang.code)
  );

  return (
    <div className="space-y-3" id={tourId}>
      <div>
        <h4 className="text-sm font-semibold text-primary-hover flex items-center gap-2">
          <Languages className="w-4 h-4" />
          Job Description Languages
        </h4>
        <p className="text-xs text-muted mt-1">
          Select languages you can read. Jobs in other languages will be skipped.
        </p>
      </div>

      {/* Selected languages as chips */}
      <div className="flex flex-wrap gap-2">
        {value.map((code) => (
          <span
            key={code}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-primary-subtle/30 text-primary-hover"
          >
            {getLanguageName(code)}
            <button
              type="button"
              onClick={() => handleRemoveLanguage(code)}
              className="hover:text-primary transition-colors p-0.5 -mr-0.5 rounded"
              aria-label={`Remove ${getLanguageName(code)}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Add language dropdown */}
        {availableLanguages.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary-subtle/30 text-default border border-transparent hover:border-primary/30 transition-all"
            >
              <Plus className="w-3 h-3" />
              Add Language
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-44 bg-surface border border-border/50 rounded-lg shadow-lg py-1">
                {availableLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleAddLanguage(lang.code)}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-default hover:bg-primary-subtle/50 transition-colors"
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty state warning */}
      {value.length === 0 && (
        <p className="text-xs text-warning">
          No languages selected. English will be used as default.
        </p>
      )}
    </div>
  );
}
