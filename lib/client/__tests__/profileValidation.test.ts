/**
 * Tests for lib/client/profileValidation.ts
 * 
 * Tests validateProfile() which validates complete profile data
 * before allowing finalization.
 */

import { describe, it, expect } from 'vitest';
import { validateProfile } from '../profileValidation';
import type { ExtractedResumeData } from '../../shared/types';

/** Helper: creates a minimal valid profile */
function makeValidProfile(overrides: Partial<ExtractedResumeData> = {}): ExtractedResumeData {
  return {
    student_name: 'John Doe',
    phone_number: '+33612345678',
    phone_country_code: 'FR',
    email: 'john@example.com',
    address: 'Paris, France',
    education: [],
    experience: [],
    projects: [],
    skills: [],
    languages: [],
    publications: [],
    certifications: [],
    social_links: {},
    ...overrides,
  };
}

// ============================================================================
// Basic contact info validation
// ============================================================================

describe('validateProfile - basic contact info', () => {
  it('should accept a valid complete profile', () => {
    const result = validateProfile(makeValidProfile());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  describe('student_name', () => {
    it('should require full name (first + last)', () => {
      const result = validateProfile(makeValidProfile({ student_name: null }));
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.student_name).toBeDefined();
    });

    it('should reject single-word name', () => {
      const result = validateProfile(makeValidProfile({ student_name: 'John' }));
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.student_name).toContain('first and last name');
    });

    it('should accept two-word name', () => {
      const result = validateProfile(makeValidProfile({ student_name: 'John Doe' }));
      expect(result.isValid).toBe(true);
    });

    it('should accept multi-word name', () => {
      const result = validateProfile(makeValidProfile({ student_name: 'Jean Pierre de la Cruz' }));
      expect(result.isValid).toBe(true);
    });

    it('should reject empty string', () => {
      const result = validateProfile(makeValidProfile({ student_name: '' }));
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.student_name).toBeDefined();
    });

    it('should reject name over 100 chars', () => {
      const result = validateProfile(makeValidProfile({ student_name: 'A'.repeat(50) + ' ' + 'B'.repeat(51) }));
      expect(result.isValid).toBe(false);
    });
  });

  describe('phone_number', () => {
    it('should require phone number', () => {
      const result = validateProfile(makeValidProfile({ phone_number: null }));
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.phone_number).toBeDefined();
    });

    it('should require country code', () => {
      const result = validateProfile(makeValidProfile({ phone_country_code: null }));
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.phone_number).toContain('Country code is required');
    });

    it('should reject phone with too few digits', () => {
      const result = validateProfile(makeValidProfile({ phone_number: '12' }));
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.phone_number).toContain('too short');
    });

    it('should reject phone with more than 15 digits', () => {
      const result = validateProfile(makeValidProfile({ phone_number: '1234567890123456' }));
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.phone_number).toContain('too long');
    });

    it('should accept valid phone number', () => {
      const result = validateProfile(makeValidProfile({ phone_number: '+33612345678' }));
      expect(result.isValid).toBe(true);
    });
  });

  describe('email', () => {
    it('should require email', () => {
      const result = validateProfile(makeValidProfile({ email: null }));
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.email).toBeDefined();
    });

    it('should reject invalid email format', () => {
      const result = validateProfile(makeValidProfile({ email: 'not-email' }));
      expect(result.isValid).toBe(false);
    });

    it('should reject email over 254 chars', () => {
      const result = validateProfile(makeValidProfile({ email: 'a'.repeat(243) + '@example.com' }));
      expect(result.isValid).toBe(false);
    });

    it('should accept valid email', () => {
      const result = validateProfile(makeValidProfile({ email: 'user@example.com' }));
      expect(result.isValid).toBe(true);
    });
  });

  describe('address', () => {
    it('should require address', () => {
      const result = validateProfile(makeValidProfile({ address: null }));
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.address).toBeDefined();
    });

    it('should reject address over 500 chars', () => {
      const result = validateProfile(makeValidProfile({ address: 'a'.repeat(501) }));
      expect(result.isValid).toBe(false);
    });

    it('should accept valid address', () => {
      const result = validateProfile(makeValidProfile({ address: 'Paris, France' }));
      expect(result.isValid).toBe(true);
    });
  });
});

// ============================================================================
// Education validation
// ============================================================================

describe('validateProfile - education', () => {
  it('should accept profile with no education', () => {
    const result = validateProfile(makeValidProfile({ education: [] }));
    expect(result.isValid).toBe(true);
  });

  it('should accept valid education entry', () => {
    const result = validateProfile(makeValidProfile({
      education: [{
        school_name: 'MIT',
        degree: 'BS Computer Science',
        description: null,
        start_year: 2018,
        start_month: 9,
        end_year: 2022,
        end_month: 6,
        confidence: 'high',
      }],
    }));
    expect(result.isValid).toBe(true);
  });

  it('should require school_name', () => {
    const result = validateProfile(makeValidProfile({
      education: [{
        school_name: '',
        degree: 'BS',
        description: null,
        start_year: 2020,
        start_month: 9,
        end_year: 2024,
        end_month: 6,
        confidence: 'high',
      }],
    }));
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.education[0]?.school_name).toBe('Required');
  });

  it('should require degree', () => {
    const result = validateProfile(makeValidProfile({
      education: [{
        school_name: 'MIT',
        degree: '',
        description: null,
        start_year: 2020,
        start_month: 9,
        end_year: 2024,
        end_month: 6,
        confidence: 'high',
      }],
    }));
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.education[0]?.degree).toBe('Required');
  });

  it('should require start date', () => {
    const result = validateProfile(makeValidProfile({
      education: [{
        school_name: 'MIT',
        degree: 'BS',
        description: null,
        start_year: null,
        start_month: null,
        end_year: 2024,
        end_month: 6,
        confidence: 'high',
      }],
    }));
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.education[0]?.start_year).toBeDefined();
    expect(result.fieldErrors.education[0]?.start_month).toBeDefined();
  });

  it('should require end date', () => {
    const result = validateProfile(makeValidProfile({
      education: [{
        school_name: 'MIT',
        degree: 'BS',
        description: null,
        start_year: 2020,
        start_month: 9,
        end_year: null,
        end_month: null,
        confidence: 'high',
      }],
    }));
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.education[0]?.end_year).toBeDefined();
  });

  it('should reject end date before start date', () => {
    const result = validateProfile(makeValidProfile({
      education: [{
        school_name: 'MIT',
        degree: 'BS',
        description: null,
        start_year: 2022,
        start_month: 9,
        end_year: 2020,
        end_month: 6,
        confidence: 'high',
      }],
    }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('End date cannot be before start date'))).toBe(true);
  });

  it('should accept same start and end date', () => {
    const result = validateProfile(makeValidProfile({
      education: [{
        school_name: 'MIT',
        degree: 'BS',
        description: null,
        start_year: 2020,
        start_month: 9,
        end_year: 2020,
        end_month: 9,
        confidence: 'high',
      }],
    }));
    // end == start should be valid
    expect(result.errors.filter(e => e.includes('End date cannot be before start date'))).toHaveLength(0);
  });

  it('should validate multiple education entries independently', () => {
    const result = validateProfile(makeValidProfile({
      education: [
        {
          school_name: 'MIT',
          degree: 'BS',
          description: null,
          start_year: 2018,
          start_month: 9,
          end_year: 2022,
          end_month: 6,
          confidence: 'high',
        },
        {
          school_name: '',
          degree: '',
          description: null,
          start_year: null,
          start_month: null,
          end_year: null,
          end_month: null,
          confidence: 'low',
        },
      ],
    }));
    expect(result.isValid).toBe(false);
    // First entry should be fine, second should have errors
    expect(result.fieldErrors.education[1]?.school_name).toBe('Required');
    expect(result.fieldErrors.education[1]?.degree).toBe('Required');
  });
});

// ============================================================================
// Experience validation
// ============================================================================

describe('validateProfile - experience', () => {
  it('should accept profile with no experience', () => {
    const result = validateProfile(makeValidProfile({ experience: [] }));
    expect(result.isValid).toBe(true);
  });

  it('should accept valid experience entry', () => {
    const result = validateProfile(makeValidProfile({
      experience: [{
        organisation_name: 'Google',
        position_name: 'Software Engineer',
        description: null,
        start_year: 2022,
        start_month: 7,
        end_year: 2024,
        end_month: 1,
        confidence: 'high',
      }],
    }));
    expect(result.isValid).toBe(true);
  });

  it('should require organisation_name', () => {
    const result = validateProfile(makeValidProfile({
      experience: [{
        organisation_name: '',
        position_name: 'Engineer',
        description: null,
        start_year: 2022,
        start_month: 7,
        end_year: 2024,
        end_month: 1,
        confidence: 'high',
      }],
    }));
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.experience[0]?.organisation_name).toBe('Required');
  });

  it('should require position_name', () => {
    const result = validateProfile(makeValidProfile({
      experience: [{
        organisation_name: 'Google',
        position_name: '',
        description: null,
        start_year: 2022,
        start_month: 7,
        end_year: 2024,
        end_month: 1,
        confidence: 'high',
      }],
    }));
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.experience[0]?.position_name).toBe('Required');
  });

  it('should reject end date before start date in experience', () => {
    const result = validateProfile(makeValidProfile({
      experience: [{
        organisation_name: 'Google',
        position_name: 'Engineer',
        description: null,
        start_year: 2024,
        start_month: 1,
        end_year: 2022,
        end_month: 7,
        confidence: 'high',
      }],
    }));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('End date cannot be before start date'))).toBe(true);
  });
});

// ============================================================================
// Projects validation
// ============================================================================

describe('validateProfile - projects', () => {
  it('should accept profile with no projects', () => {
    const result = validateProfile(makeValidProfile({ projects: [] }));
    expect(result.isValid).toBe(true);
  });

  it('should accept valid project entry', () => {
    const result = validateProfile(makeValidProfile({
      projects: [{
        project_name: 'Open Source Lib',
        description: 'A library',
        link: null,
      }],
    }));
    expect(result.isValid).toBe(true);
  });

  it('should require project_name', () => {
    const result = validateProfile(makeValidProfile({
      projects: [{
        project_name: '',
        description: null,
        link: null,
      }],
    }));
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.projects?.[0]?.project_name).toBe('Required');
  });
});

// ============================================================================
// Skills validation
// ============================================================================

describe('validateProfile - skills', () => {
  it('should accept profile with no skills', () => {
    const result = validateProfile(makeValidProfile({ skills: [] }));
    expect(result.isValid).toBe(true);
  });

  it('should accept valid skill entry', () => {
    const result = validateProfile(makeValidProfile({
      skills: [{
        skill_name: 'TypeScript',
        skill_slug: 'typescript',
      }],
    }));
    expect(result.isValid).toBe(true);
  });

  it('should require skill_name', () => {
    const result = validateProfile(makeValidProfile({
      skills: [{
        skill_name: '',
        skill_slug: 'empty',
      }],
    }));
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.skills?.[0]?.skill_name).toBe('Required');
  });
});

// ============================================================================
// Languages validation
// ============================================================================

describe('validateProfile - languages', () => {
  it('should accept profile with no languages', () => {
    const result = validateProfile(makeValidProfile({ languages: [] }));
    expect(result.isValid).toBe(true);
  });

  it('should accept valid language entry', () => {
    const result = validateProfile(makeValidProfile({
      languages: [{
        language_name: 'English',
        proficiency_level: 'Native',
      }],
    }));
    expect(result.isValid).toBe(true);
  });

  it('should require language_name', () => {
    const result = validateProfile(makeValidProfile({
      languages: [{
        language_name: '',
        proficiency_level: 'Native',
      }],
    }));
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.languages?.[0]?.language_name).toBe('Required');
  });
});

// ============================================================================
// Publications validation
// ============================================================================

describe('validateProfile - publications', () => {
  it('should accept profile with no publications', () => {
    const result = validateProfile(makeValidProfile({ publications: [] }));
    expect(result.isValid).toBe(true);
  });

  it('should accept valid publication entry', () => {
    const result = validateProfile(makeValidProfile({
      publications: [{
        title: 'ML Paper',
        journal_name: 'Nature',
        description: null,
        publication_year: 2023,
        publication_month: 3,
        link: null,
      }],
    }));
    expect(result.isValid).toBe(true);
  });

  it('should require title', () => {
    const result = validateProfile(makeValidProfile({
      publications: [{
        title: '',
        journal_name: null,
        description: null,
        publication_year: null,
        publication_month: null,
        link: null,
      }],
    }));
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.publications?.[0]?.title).toBe('Required');
  });
});

// ============================================================================
// Certifications validation
// ============================================================================

describe('validateProfile - certifications', () => {
  it('should accept profile with no certifications', () => {
    const result = validateProfile(makeValidProfile({ certifications: [] }));
    expect(result.isValid).toBe(true);
  });

  it('should accept valid certification entry', () => {
    const result = validateProfile(makeValidProfile({
      certifications: [{
        name: 'AWS Certified',
        issuing_organization: 'Amazon',
        url: null,
      }],
    }));
    expect(result.isValid).toBe(true);
  });

  it('should require name', () => {
    const result = validateProfile(makeValidProfile({
      certifications: [{
        name: '',
        issuing_organization: null,
        url: null,
      }],
    }));
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.certifications?.[0]?.name).toBe('Required');
  });
});

// ============================================================================
// Social links validation
// ============================================================================

describe('validateProfile - social links', () => {
  it('should accept profile with empty social links', () => {
    const result = validateProfile(makeValidProfile({ social_links: {} }));
    expect(result.isValid).toBe(true);
  });

  it('should accept valid URLs', () => {
    const result = validateProfile(makeValidProfile({
      social_links: {
        github: 'https://github.com/johndoe',
        linkedin: 'https://linkedin.com/in/johndoe',
      },
    }));
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid URL for github', () => {
    const result = validateProfile(makeValidProfile({
      social_links: {
        github: 'not-a-url',
      },
    }));
    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.social_links?.github).toContain('Invalid URL');
  });

  it('should reject invalid URL for linkedin', () => {
    const result = validateProfile(makeValidProfile({
      social_links: {
        linkedin: 'invalid',
      },
    }));
    expect(result.isValid).toBe(false);
  });

  it('should accept null/undefined platform URLs', () => {
    const result = validateProfile(makeValidProfile({
      social_links: {
        github: null,
        linkedin: undefined,
      },
    }));
    expect(result.isValid).toBe(true);
  });

  it('should accept empty string platform URLs', () => {
    const result = validateProfile(makeValidProfile({
      social_links: {
        github: '',
        linkedin: '',
      },
    }));
    // Empty strings should pass (they're falsy, skip URL validation)
    expect(result.isValid).toBe(true);
  });

  it('should validate all 5 platform URLs', () => {
    const result = validateProfile(makeValidProfile({
      social_links: {
        github: 'https://github.com/user',
        linkedin: 'https://linkedin.com/in/user',
        stackoverflow: 'https://stackoverflow.com/users/123',
        kaggle: 'https://kaggle.com/user',
        leetcode: 'https://leetcode.com/user',
      },
    }));
    expect(result.isValid).toBe(true);
  });
});

// ============================================================================
// Combined validation
// ============================================================================

describe('validateProfile - combined errors', () => {
  it('should accumulate all errors', () => {
    const result = validateProfile({
      student_name: null,
      phone_number: null,
      phone_country_code: null,
      email: null,
      address: null,
      education: [],
      experience: [],
      projects: [],
      skills: [],
      languages: [],
      publications: [],
      certifications: [],
      social_links: {},
    });

    expect(result.isValid).toBe(false);
    // Should have errors for: name, phone (country code), email, address
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
    expect(result.fieldErrors.student_name).toBeDefined();
    expect(result.fieldErrors.phone_number).toBeDefined();
    expect(result.fieldErrors.email).toBeDefined();
    expect(result.fieldErrors.address).toBeDefined();
  });

  it('should return isValid true only when all fields are valid', () => {
    const result = validateProfile(makeValidProfile());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
