/**
 * PhoneInput Component
 * 
 * Simple phone input with country selector dropdown.
 * 
 * Design philosophy:
 * - Country dropdown stores ISO code (FR, US, etc.)
 * - Phone input is free-text (user types whatever they want)
 * - E.164 normalization happens at finalize/export time, not in UI
 * 
 * Used by: BasicInfoForm (profile editor)
 * Data flow: UI (raw) -> Draft (raw) -> Finalize (E.164) -> DB -> Bot
 */

'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
  getAllCountries,
  filterCountries,
  normalizeCountryCode,
  type CountryInfo,
} from '@/lib/shared/phone';
import type { CountryCode } from 'libphonenumber-js';

// ============================================================================
// Types
// ============================================================================

export interface PhoneInputProps {
  /** Input element ID (required for accessibility) */
  id: string;
  /** Raw phone string (whatever user typed) */
  phoneValue: string | null;
  /** ISO 3166-1 alpha-2 country code (FR, US, GB) */
  countryCode: string | null;
  /** Callback when phone value changes */
  onPhoneChange: (phone: string) => void;
  /** Callback when country changes */
  onCountryChange: (country: string) => void;
  /** Validation error from parent form */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

// ============================================================================
// Country Selector Component
// ============================================================================

interface CountrySelectorProps {
  country: CountryCode;
  countries: CountryInfo[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (country: CountryInfo) => void;
  hasError: boolean;
  disabled: boolean;
}

function CountrySelector({
  country,
  countries,
  isOpen,
  onToggle,
  onClose,
  onSelect,
  hasError,
  disabled,
}: CountrySelectorProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Find selected country info
  const selectedCountry = useMemo(
    () => countries.find(c => c.code === country) || countries[0],
    [countries, country]
  );

  // Filter countries by search
  const filteredCountries = useMemo(
    () => filterCountries(countries, searchQuery),
    [countries, searchQuery]
  );

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Handle country selection
  const handleSelect = useCallback((countryInfo: CountryInfo) => {
    onSelect(countryInfo);
    setSearchQuery('');
  }, [onSelect]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={`Selected country: ${selectedCountry.name}. Click to change.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`
          flex items-center gap-1 px-2.5 py-2 text-sm rounded-l border border-r-0 bg-white
          transition-colors min-w-[56px] justify-center h-[38px]
          ${hasError ? 'border-warning' : 'border-border'}
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}
        `}
      >
        <span className="text-lg leading-none" aria-hidden="true">{selectedCountry.flag}</span>
        <ChevronDown 
          className={`w-3.5 h-3.5 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div 
          className="absolute z-50 top-full left-0 mt-1 w-72 max-h-64 bg-white border border-border rounded-lg shadow-lg overflow-hidden"
          role="listbox"
          aria-label="Select country"
          onKeyDown={handleKeyDown}
        >
          {/* Search */}
          <div className="sticky top-0 bg-white p-2 border-b border-border">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search countries..."
              className="w-full px-3 py-1.5 text-sm border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              aria-label="Search countries"
            />
          </div>
          
          {/* Country list */}
          <div className="overflow-y-auto max-h-48">
            {filteredCountries.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted text-center">
                No countries found
              </div>
            ) : (
              filteredCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  role="option"
                  aria-selected={c.code === country}
                  onClick={() => handleSelect(c)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 text-sm text-left
                    transition-colors hover:bg-primary-subtle
                    ${c.code === country ? 'bg-primary-subtle font-medium' : ''}
                  `}
                >
                  <span className="text-lg" aria-hidden="true">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-muted text-xs">{c.callingCode}</span>
                  {c.code === country && (
                    <Check className="w-4 h-4 text-primary" aria-hidden="true" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main PhoneInput Component
// ============================================================================

export default function PhoneInput({
  id,
  phoneValue,
  countryCode,
  onPhoneChange,
  onCountryChange,
  error,
  disabled = false,
  placeholder = 'Phone number',
}: PhoneInputProps) {
  // Normalize country code (default to FR)
  const currentCountry = normalizeCountryCode(countryCode, 'FR');
  
  // All countries for dropdown (memoized, stable)
  const allCountries = useMemo(() => getAllCountries(), []);
  
  // Sync the default country back to parent if countryCode was null
  // This ensures the stored value matches what the user sees in the UI
  useEffect(() => {
    if (countryCode === null && currentCountry) {
      onCountryChange(currentCountry);
    }
  }, [countryCode, currentCountry, onCountryChange]);
  
  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Handle phone input change
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onPhoneChange(e.target.value);
  }, [onPhoneChange]);

  // Handle country selection from dropdown
  const handleCountrySelect = useCallback((countryInfo: CountryInfo) => {
    setIsDropdownOpen(false);
    onCountryChange(countryInfo.code);
  }, [onCountryChange]);

  // Toggle dropdown
  const handleToggleDropdown = useCallback(() => {
    if (!disabled) {
      setIsDropdownOpen(prev => !prev);
    }
  }, [disabled]);

  // Close dropdown (stable reference for click-outside handler)
  const handleCloseDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  const hasError = !!error;

  return (
    <div className="space-y-1">
      <div className="relative flex">
        {/* Country selector */}
        <CountrySelector
          country={currentCountry}
          countries={allCountries}
          isOpen={isDropdownOpen}
          onToggle={handleToggleDropdown}
          onClose={handleCloseDropdown}
          onSelect={handleCountrySelect}
          hasError={hasError}
          disabled={disabled}
        />

        {/* Phone input (simple text input) */}
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phoneValue || ''}
          onChange={handlePhoneChange}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={hasError}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`
            flex-1 px-3 py-2 text-sm rounded-r border bg-white h-[38px]
            focus:outline-none focus:ring-2 focus:ring-primary/30
            transition-colors
            ${hasError ? 'border-warning focus:border-warning' : 'border-border focus:border-primary'}
            ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}
          `}
        />
      </div>
      
      {/* Error message from parent */}
      {error && (
        <p id={`${id}-error`} className="text-xs text-warning">
          {error}
        </p>
      )}
    </div>
  );
}
