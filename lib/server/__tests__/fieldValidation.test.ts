/**
 * Tests for lib/server/fieldValidation.ts
 * 
 * Tests all field validation functions:
 * - validatePhoneNumber
 * - validateEmail
 * - validateAddress
 * - validateDate (with natural language parsing)
 * - validateTextField
 * - validateField (router)
 */

import { describe, it, expect } from 'vitest';
import {
  validatePhoneNumber,
  validateEmail,
  validateAddress,
  validateDate,
  validateTextField,
  validateField,
} from '../fieldValidation';

// ============================================================================
// validatePhoneNumber
// ============================================================================

describe('validatePhoneNumber', () => {
  it('should accept a valid phone number', () => {
    const result = validatePhoneNumber('+33612345678');
    expect(result.isValid).toBe(true);
    expect(result.normalizedValue).toBe('+33612345678');
  });

  it('should accept a formatted phone number', () => {
    const result = validatePhoneNumber('+1 (555) 123-4567');
    expect(result.isValid).toBe(true);
  });

  it('should reject null value', () => {
    const result = validatePhoneNumber(null);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Phone number is required');
  });

  it('should reject undefined value', () => {
    const result = validatePhoneNumber(undefined);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Phone number is required');
  });

  it('should reject empty string', () => {
    const result = validatePhoneNumber('');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Phone number is required');
  });

  it('should reject whitespace-only string', () => {
    const result = validatePhoneNumber('   ');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Phone number is required');
  });

  it('should reject phone with too few digits', () => {
    const result = validatePhoneNumber('123');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Phone number is too short');
  });

  it('should accept phone with exactly 4 digits', () => {
    const result = validatePhoneNumber('1234');
    expect(result.isValid).toBe(true);
  });

  it('should reject phone with more than 15 digits', () => {
    const result = validatePhoneNumber('1234567890123456');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Phone number is too long');
  });

  it('should accept phone with exactly 15 digits', () => {
    const result = validatePhoneNumber('123456789012345');
    expect(result.isValid).toBe(true);
  });

  it('should trim the phone number', () => {
    const result = validatePhoneNumber('  +33612345678  ');
    expect(result.isValid).toBe(true);
    expect(result.normalizedValue).toBe('+33612345678');
  });

  it('should accept phone with valid country code parameter', () => {
    const result = validatePhoneNumber('+33612345678', 'FR');
    expect(result.isValid).toBe(true);
  });

  it('should count only digits for length validation', () => {
    // 10 digits but with formatting chars
    const result = validatePhoneNumber('+1 (555) 123-4567');
    expect(result.isValid).toBe(true);
  });
});

// ============================================================================
// validateEmail
// ============================================================================

describe('validateEmail', () => {
  it('should accept a valid email', () => {
    const result = validateEmail('user@example.com');
    expect(result.isValid).toBe(true);
    expect(result.normalizedValue).toBe('user@example.com');
  });

  it('should normalize email to lowercase', () => {
    const result = validateEmail('User@Example.COM');
    expect(result.isValid).toBe(true);
    expect(result.normalizedValue).toBe('user@example.com');
  });

  it('should reject null value', () => {
    const result = validateEmail(null);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Email address is required');
  });

  it('should reject undefined value', () => {
    const result = validateEmail(undefined);
    expect(result.isValid).toBe(false);
  });

  it('should reject empty string', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Email address is required');
  });

  it('should reject whitespace-only string', () => {
    const result = validateEmail('   ');
    expect(result.isValid).toBe(false);
  });

  it('should reject email without @', () => {
    const result = validateEmail('userexample.com');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Invalid email format');
  });

  it('should reject email without domain', () => {
    const result = validateEmail('user@');
    expect(result.isValid).toBe(false);
  });

  it('should reject email with too short domain', () => {
    const result = validateEmail('user@ab');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Invalid domain');
  });

  it('should reject email longer than 254 characters', () => {
    // Build a valid-format email that exceeds 254 chars using multiple short domain labels
    // Each label must be <= 63 chars to pass the regex, so we chain many labels
    const longLocal = 'a'.repeat(64);
    // Create domain with many labels: "b.b.b.b...b.com" to exceed 254 total
    const labels = Array(96).fill('b').join('.');
    const longDomain = labels + '.com';
    const email = `${longLocal}@${longDomain}`;
    expect(email.length).toBeGreaterThan(254);
    const result = validateEmail(email);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('too long');
  });

  it('should reject local part longer than 64 characters', () => {
    const longLocal = 'a'.repeat(65);
    const result = validateEmail(`${longLocal}@example.com`);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('local part too long');
  });

  it('should accept email with dots in local part', () => {
    const result = validateEmail('first.last@example.com');
    expect(result.isValid).toBe(true);
  });

  it('should accept email with plus sign', () => {
    const result = validateEmail('user+tag@example.com');
    expect(result.isValid).toBe(true);
  });

  it('should accept email with subdomain', () => {
    const result = validateEmail('user@mail.example.com');
    expect(result.isValid).toBe(true);
  });

  it('should trim whitespace before validation', () => {
    const result = validateEmail('  user@example.com  ');
    expect(result.isValid).toBe(true);
    expect(result.normalizedValue).toBe('user@example.com');
  });
});

// ============================================================================
// validateAddress
// ============================================================================

describe('validateAddress', () => {
  it('should accept a valid address', () => {
    const result = validateAddress('Paris, France');
    expect(result.isValid).toBe(true);
    expect(result.normalizedValue).toBe('Paris, France');
  });

  it('should reject null value', () => {
    const result = validateAddress(null);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Address is required');
  });

  it('should reject undefined value', () => {
    const result = validateAddress(undefined);
    expect(result.isValid).toBe(false);
  });

  it('should reject empty string', () => {
    const result = validateAddress('');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Address is required');
  });

  it('should reject address shorter than 3 characters', () => {
    const result = validateAddress('NY');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('at least 3 characters');
  });

  it('should accept address of exactly 3 characters', () => {
    const result = validateAddress('NYC');
    expect(result.isValid).toBe(true);
  });

  it('should reject address longer than 500 characters', () => {
    const result = validateAddress('a'.repeat(501));
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('max 500');
  });

  it('should accept address of exactly 500 characters', () => {
    const result = validateAddress('a'.repeat(500));
    expect(result.isValid).toBe(true);
  });

  it('should trim whitespace', () => {
    const result = validateAddress('  Paris, France  ');
    expect(result.isValid).toBe(true);
    expect(result.normalizedValue).toBe('Paris, France');
  });
});

// ============================================================================
// validateDate
// ============================================================================

describe('validateDate', () => {
  describe('null/empty handling', () => {
    it('should reject null value', () => {
      const result = validateDate(null);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('date is required');
    });

    it('should reject undefined value', () => {
      const result = validateDate(undefined);
      expect(result.isValid).toBe(false);
    });

    it('should reject empty string', () => {
      const result = validateDate('');
      expect(result.isValid).toBe(false);
    });

    it('should reject whitespace-only string', () => {
      const result = validateDate('   ');
      expect(result.isValid).toBe(false);
    });

    it('should use custom field name in error messages', () => {
      const result = validateDate(null, 'start date');
      expect(result.errorMessage).toContain('start date is required');
    });
  });

  describe('present keywords', () => {
    it.each(['present', 'current', 'currently', 'ongoing', 'now', 'today'])(
      'should accept "%s" as present keyword',
      (keyword) => {
        const result = validateDate(keyword);
        expect(result.isValid).toBe(true);
        expect(result.normalizedValue).toBeNull();
      }
    );

    it('should handle present keywords case-insensitively', () => {
      const result = validateDate('PRESENT');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBeNull();
    });

    it('should handle present keywords with whitespace', () => {
      const result = validateDate('  present  ');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBeNull();
    });
  });

  describe('ISO format (YYYY-MM-DD)', () => {
    it('should accept valid ISO date', () => {
      const result = validateDate('2020-05-15');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('2020-05-15');
    });

    it('should reject invalid month in ISO date', () => {
      const result = validateDate('2020-13-15');
      expect(result.isValid).toBe(false);
    });

    it('should reject invalid day in ISO date', () => {
      const result = validateDate('2020-02-30');
      expect(result.isValid).toBe(false);
    });

    it('should reject Feb 29 in non-leap year', () => {
      const result = validateDate('2023-02-29');
      expect(result.isValid).toBe(false);
    });

    it('should accept Feb 29 in leap year', () => {
      const result = validateDate('2024-02-29');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('2024-02-29');
    });

    it('should reject year before 1950', () => {
      const result = validateDate('1949-01-01');
      expect(result.isValid).toBe(false);
    });

    it('should reject year after 2050', () => {
      const result = validateDate('2051-01-01');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Year-Month format (YYYY-MM)', () => {
    it('should accept valid year-month', () => {
      const result = validateDate('2020-05');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('2020-05');
    });

    it('should reject invalid month', () => {
      const result = validateDate('2020-13');
      expect(result.isValid).toBe(false);
    });

    it('should reject month 00', () => {
      const result = validateDate('2020-00');
      expect(result.isValid).toBe(false);
    });

    it('should accept month 12', () => {
      const result = validateDate('2020-12');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Year-only format (YYYY)', () => {
    it('should accept valid year', () => {
      const result = validateDate('2020');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('2020');
    });

    it('should accept boundary year 1950', () => {
      const result = validateDate('1950');
      expect(result.isValid).toBe(true);
    });

    it('should accept boundary year 2050', () => {
      const result = validateDate('2050');
      expect(result.isValid).toBe(true);
    });

    it('should reject year 1949', () => {
      const result = validateDate('1949');
      expect(result.isValid).toBe(false);
    });

    it('should reject year 2051', () => {
      const result = validateDate('2051');
      expect(result.isValid).toBe(false);
    });
  });

  describe('natural language: "Month YYYY"', () => {
    it('should accept "May 2020"', () => {
      const result = validateDate('May 2020');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('2020-05');
    });

    it('should accept abbreviated month "Jan 2021"', () => {
      const result = validateDate('Jan 2021');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('2021-01');
    });

    it('should accept "September 2019"', () => {
      const result = validateDate('September 2019');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('2019-09');
    });

    it('should accept "sept 2019" (alternative abbreviation)', () => {
      const result = validateDate('sept 2019');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('2019-09');
    });

    it('should handle case-insensitively', () => {
      const result = validateDate('DECEMBER 2022');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('2022-12');
    });

    it('should reject invalid month name', () => {
      const result = validateDate('Smarch 2020');
      expect(result.isValid).toBe(false);
    });

    it.each([
      ['January 2020', '2020-01'],
      ['February 2020', '2020-02'],
      ['March 2020', '2020-03'],
      ['April 2020', '2020-04'],
      ['May 2020', '2020-05'],
      ['June 2020', '2020-06'],
      ['July 2020', '2020-07'],
      ['August 2020', '2020-08'],
      ['September 2020', '2020-09'],
      ['October 2020', '2020-10'],
      ['November 2020', '2020-11'],
      ['December 2020', '2020-12'],
    ])('should parse "%s" to "%s"', (input, expected) => {
      const result = validateDate(input);
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe(expected);
    });
  });

  describe('natural language: "Month DD, YYYY"', () => {
    it('should accept "January 15, 2020"', () => {
      const result = validateDate('January 15, 2020');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('2020-01-15');
    });

    it('should accept "May 1, 2020" (single-digit day)', () => {
      const result = validateDate('May 1, 2020');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('2020-05-01');
    });

    it('should accept without comma "June 15 2020"', () => {
      const result = validateDate('June 15 2020');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('2020-06-15');
    });
  });

  describe('natural language: "DD Month YYYY"', () => {
    it('should accept "15 January 2020"', () => {
      const result = validateDate('15 January 2020');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('2020-01-15');
    });

    it('should accept "1 May 2020" (single-digit day)', () => {
      const result = validateDate('1 May 2020');
      expect(result.isValid).toBe(true);
      expect(result.normalizedValue).toBe('2020-05-01');
    });
  });

  describe('invalid formats', () => {
    it('should reject random text', () => {
      const result = validateDate('not a date');
      expect(result.isValid).toBe(false);
    });

    it('should reject numbers with wrong digit count', () => {
      const result = validateDate('12345');
      expect(result.isValid).toBe(false);
    });

    it('should reject MM/DD/YYYY format', () => {
      const result = validateDate('05/15/2020');
      expect(result.isValid).toBe(false);
    });

    it('should reject DD/MM/YYYY format', () => {
      const result = validateDate('15/05/2020');
      expect(result.isValid).toBe(false);
    });
  });
});

// ============================================================================
// validateTextField
// ============================================================================

describe('validateTextField', () => {
  it('should accept valid text', () => {
    const result = validateTextField('Software Engineer', 'Position');
    expect(result.isValid).toBe(true);
    expect(result.normalizedValue).toBe('Software Engineer');
  });

  it('should reject null value', () => {
    const result = validateTextField(null, 'Position');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Position is required');
  });

  it('should reject undefined value', () => {
    const result = validateTextField(undefined, 'Position');
    expect(result.isValid).toBe(false);
  });

  it('should reject empty string', () => {
    const result = validateTextField('', 'Position');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Position is required');
  });

  it('should reject text shorter than 2 characters', () => {
    const result = validateTextField('a', 'Position');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('at least 2 characters');
  });

  it('should accept text of exactly 2 characters', () => {
    const result = validateTextField('AB', 'Position');
    expect(result.isValid).toBe(true);
  });

  it('should reject text longer than 200 characters', () => {
    const result = validateTextField('a'.repeat(201), 'Position');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('max 200');
  });

  it('should accept text of exactly 200 characters', () => {
    const result = validateTextField('a'.repeat(200), 'Position');
    expect(result.isValid).toBe(true);
  });

  it('should trim whitespace', () => {
    const result = validateTextField('  Software Engineer  ', 'Position');
    expect(result.isValid).toBe(true);
    expect(result.normalizedValue).toBe('Software Engineer');
  });

  it('should include field name in error messages', () => {
    const result = validateTextField('', 'Company Name');
    expect(result.errorMessage).toBe('Company Name is required');
  });
});

// ============================================================================
// validateField (router)
// ============================================================================

describe('validateField', () => {
  it('should route phone_number to validatePhoneNumber', () => {
    const result = validateField('phone_number', '+33612345678');
    expect(result.isValid).toBe(true);
  });

  it('should route email to validateEmail', () => {
    const result = validateField('email', 'user@example.com');
    expect(result.isValid).toBe(true);
  });

  it('should route address to validateAddress', () => {
    const result = validateField('address', 'Paris, France');
    expect(result.isValid).toBe(true);
  });

  it('should route fields containing "date" to validateDate', () => {
    const result = validateField('start_date', '2020-05');
    expect(result.isValid).toBe(true);
  });

  it('should route date fields with underscores', () => {
    const result = validateField('end_date', 'present');
    expect(result.isValid).toBe(true);
    expect(result.normalizedValue).toBeNull();
  });

  it('should route other fields to validateTextField', () => {
    const result = validateField('position_name', 'Software Engineer');
    expect(result.isValid).toBe(true);
  });

  it('should replace underscores with spaces for display name', () => {
    const result = validateField('organisation_name', '');
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('organisation name is required');
  });

  it('should reject invalid phone_number', () => {
    const result = validateField('phone_number', '12');
    expect(result.isValid).toBe(false);
  });

  it('should reject invalid email', () => {
    const result = validateField('email', 'not-email');
    expect(result.isValid).toBe(false);
  });

  it('should reject invalid address', () => {
    const result = validateField('address', '');
    expect(result.isValid).toBe(false);
  });
});
