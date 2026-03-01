/**
 * Tests for lib/server/validation.ts
 * 
 * Tests all 7 Zod schemas + validateRequest helper function.
 * Covers valid inputs, invalid inputs, edge cases, and error formatting.
 */

import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  signupSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  workPreferencesSchema,
  feedbackSchema,
  profileDraftSchema,
  validateRequest,
} from '../validation';

// ============================================================================
// loginSchema
// ============================================================================

describe('loginSchema', () => {
  it('should accept valid login data', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('should accept login with optional captchaToken', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      captchaToken: 'abc123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing email', () => {
    const result = loginSchema.safeParse({
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('should accept password of any length (min 1)', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'a',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// signupSchema
// ============================================================================

describe('signupSchema', () => {
  it('should accept valid student signup', () => {
    const result = signupSchema.safeParse({
      email: 'student@example.com',
      password: 'password123',
      role: 'student',
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid company signup', () => {
    const result = signupSchema.safeParse({
      email: 'company@example.com',
      password: 'password123',
      role: 'company',
    });
    expect(result.success).toBe(true);
  });

  it('should accept signup with referral code', () => {
    const result = signupSchema.safeParse({
      email: 'student@example.com',
      password: 'password123',
      role: 'student',
      referralCode: 'abcd1234',
    });
    expect(result.success).toBe(true);
  });

  it('should accept signup with null referral code', () => {
    const result = signupSchema.safeParse({
      email: 'student@example.com',
      password: 'password123',
      role: 'student',
      referralCode: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid role', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      role: 'admin',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 characters', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: '1234567',
      role: 'student',
    });
    expect(result.success).toBe(false);
  });

  it('should accept password of exactly 8 characters', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: '12345678',
      role: 'student',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid referral code format (too short)', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      role: 'student',
      referralCode: 'abc',
    });
    expect(result.success).toBe(false);
  });

  it('should reject referral code with uppercase letters', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      role: 'student',
      referralCode: 'ABCD1234',
    });
    expect(result.success).toBe(false);
  });

  it('should reject referral code with special characters', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      role: 'student',
      referralCode: 'abcd-123',
    });
    expect(result.success).toBe(false);
  });

  it('should accept signup with optional captchaToken', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      role: 'student',
      captchaToken: 'token123',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// resetPasswordSchema
// ============================================================================

describe('resetPasswordSchema', () => {
  it('should accept valid email', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'user@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should accept with optional captchaToken', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'user@example.com',
      captchaToken: 'token',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty email', () => {
    const result = resetPasswordSchema.safeParse({
      email: '',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// updatePasswordSchema
// ============================================================================

describe('updatePasswordSchema', () => {
  it('should accept valid password (8+ chars)', () => {
    const result = updatePasswordSchema.safeParse({
      password: 'newpassword123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject password shorter than 8 chars', () => {
    const result = updatePasswordSchema.safeParse({
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = updatePasswordSchema.safeParse({
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('should accept exactly 8 characters', () => {
    const result = updatePasswordSchema.safeParse({
      password: 'exactly8',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// workPreferencesSchema
// ============================================================================

describe('workPreferencesSchema', () => {
  it('should accept empty object (all fields optional)', () => {
    const result = workPreferencesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept full preferences', () => {
    const result = workPreferencesSchema.safeParse({
      remote_work: true,
      in_person_work: false,
      exp_internship: true,
      exp_entry: true,
      exp_associate: false,
      exp_mid_senior: false,
      exp_director: false,
      exp_executive: false,
      job_full_time: true,
      job_part_time: false,
      job_contract: false,
      job_temporary: false,
      job_internship: false,
      job_volunteer: false,
      job_other: false,
      date_24_hours: false,
      date_week: true,
      date_month: false,
      date_all_time: false,
      positions: ['Software Engineer'],
      locations: ['Paris'],
      company_blacklist: ['BadCorp'],
      title_blacklist: ['Senior'],
      job_languages: ['en', 'fr'],
    });
    expect(result.success).toBe(true);
  });

  it('should provide defaults for array fields', () => {
    const result = workPreferencesSchema.parse({});
    expect(result.positions).toEqual([]);
    expect(result.locations).toEqual([]);
    expect(result.company_blacklist).toEqual([]);
    expect(result.title_blacklist).toEqual([]);
    expect(result.job_languages).toEqual(['en']);
  });

  it('should reject position strings over 200 chars', () => {
    const result = workPreferencesSchema.safeParse({
      positions: ['a'.repeat(201)],
    });
    expect(result.success).toBe(false);
  });

  it('should reject more than 50 positions', () => {
    const result = workPreferencesSchema.safeParse({
      positions: Array.from({ length: 51 }, (_, i) => `Position ${i}`),
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid job_languages (not 2 chars)', () => {
    const result = workPreferencesSchema.safeParse({
      job_languages: ['english'],
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid salary expectation', () => {
    const result = workPreferencesSchema.safeParse({
      salary_expectation_usd: 100000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative salary', () => {
    const result = workPreferencesSchema.safeParse({
      salary_expectation_usd: -1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject salary over 10 million', () => {
    const result = workPreferencesSchema.safeParse({
      salary_expectation_usd: 10000001,
    });
    expect(result.success).toBe(false);
  });

  it('should accept nullable personal fields', () => {
    const result = workPreferencesSchema.safeParse({
      date_of_birth: null,
      pronouns: null,
      gender: null,
      ethnicity: null,
      notice_period: null,
      salary_expectation_usd: null,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// feedbackSchema
// ============================================================================

describe('feedbackSchema', () => {
  it('should accept valid bug feedback', () => {
    const result = feedbackSchema.safeParse({
      feedback_type: 'bug',
      subject: 'Login broken',
      description: 'Cannot log in with valid credentials on Chrome',
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid feature feedback', () => {
    const result = feedbackSchema.safeParse({
      feedback_type: 'feature',
      subject: 'Dark mode',
      description: 'Please add dark mode support to the dashboard',
    });
    expect(result.success).toBe(true);
  });

  it('should accept feedback with all optional fields', () => {
    const result = feedbackSchema.safeParse({
      feedback_type: 'bug',
      subject: 'Issue title',
      description: 'Detailed issue description here',
      user_email: 'user@example.com',
      user_agent: 'Mozilla/5.0 ...',
      page_url: 'https://jobelix.com/dashboard',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid feedback_type', () => {
    const result = feedbackSchema.safeParse({
      feedback_type: 'question',
      subject: 'Test',
      description: 'Test description here',
    });
    expect(result.success).toBe(false);
  });

  it('should reject subject shorter than 3 chars', () => {
    const result = feedbackSchema.safeParse({
      feedback_type: 'bug',
      subject: 'Hi',
      description: 'Test description here',
    });
    expect(result.success).toBe(false);
  });

  it('should reject description shorter than 10 chars', () => {
    const result = feedbackSchema.safeParse({
      feedback_type: 'bug',
      subject: 'Bug report',
      description: 'Short',
    });
    expect(result.success).toBe(false);
  });

  it('should reject subject over 200 chars', () => {
    const result = feedbackSchema.safeParse({
      feedback_type: 'bug',
      subject: 'a'.repeat(201),
      description: 'Test description here',
    });
    expect(result.success).toBe(false);
  });

  it('should reject description over 5000 chars', () => {
    const result = feedbackSchema.safeParse({
      feedback_type: 'bug',
      subject: 'Bug report',
      description: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('should trim subject and description', () => {
    const result = feedbackSchema.parse({
      feedback_type: 'bug',
      subject: '  Trimmed Subject  ',
      description: '  Trimmed description text  ',
    });
    expect(result.subject).toBe('Trimmed Subject');
    expect(result.description).toBe('Trimmed description text');
  });

  it('should reject invalid page_url', () => {
    const result = feedbackSchema.safeParse({
      feedback_type: 'bug',
      subject: 'Bug report',
      description: 'Test description here',
      page_url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// profileDraftSchema
// ============================================================================

describe('profileDraftSchema', () => {
  it('should accept minimal valid draft', () => {
    const result = profileDraftSchema.safeParse({
      phone_number: '+33612345678',
      address: 'Paris, France',
    });
    expect(result.success).toBe(true);
  });

  it('should accept full draft with all fields', () => {
    const result = profileDraftSchema.safeParse({
      student_name: 'John Doe',
      phone_number: '+33612345678',
      email: 'john@example.com',
      address: 'Paris, France',
      education: [{
        school: 'MIT',
        degree: 'BS Computer Science',
        field: 'CS',
        description: 'Honors student',
        startDate: { year: 2018, month: 9 },
        endDate: { year: 2022, month: 6 },
      }],
      experience: [{
        company: 'Google',
        position: 'Software Engineer',
        description: 'Worked on search',
        startDate: { year: 2022, month: 7 },
        endDate: { year: 2024, month: 1 },
      }],
      projects: [{
        name: 'Open Source Lib',
        description: 'A useful library',
        link: 'https://github.com/example/lib',
      }],
      skills: [{
        name: 'TypeScript',
        slug: 'typescript',
      }],
      languages: [{
        name: 'English',
        proficiency: 'Native',
      }],
      publications: [{
        title: 'ML Paper',
        journal: 'Nature',
        description: 'A research paper',
        date: { year: 2023, month: 3 },
        link: 'https://doi.org/example',
      }],
      certifications: [{
        name: 'AWS Certified',
        issuer: 'Amazon',
        url: 'https://aws.amazon.com/cert/123',
      }],
      social_links: {
        github: 'https://github.com/johndoe',
        linkedin: 'https://linkedin.com/in/johndoe',
      },
    });
    expect(result.success).toBe(true);
  });

  it('should provide defaults for array fields', () => {
    const result = profileDraftSchema.parse({
      phone_number: '+33612345678',
      address: 'Paris',
    });
    expect(result.education).toEqual([]);
    expect(result.experience).toEqual([]);
    expect(result.projects).toEqual([]);
    expect(result.skills).toEqual([]);
    expect(result.languages).toEqual([]);
    expect(result.publications).toEqual([]);
    expect(result.certifications).toEqual([]);
    expect(result.social_links).toEqual({});
  });

  it('should reject empty phone_number', () => {
    const result = profileDraftSchema.safeParse({
      phone_number: '',
      address: 'Paris',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty address', () => {
    const result = profileDraftSchema.safeParse({
      phone_number: '+33612345678',
      address: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject education with missing required school', () => {
    const result = profileDraftSchema.safeParse({
      phone_number: '+33612345678',
      address: 'Paris',
      education: [{
        degree: 'BS',
      }],
    });
    expect(result.success).toBe(false);
  });

  it('should reject education with missing required degree', () => {
    const result = profileDraftSchema.safeParse({
      phone_number: '+33612345678',
      address: 'Paris',
      education: [{
        school: 'MIT',
      }],
    });
    expect(result.success).toBe(false);
  });

  it('should accept project with empty string link', () => {
    const result = profileDraftSchema.safeParse({
      phone_number: '+33612345678',
      address: 'Paris',
      projects: [{
        name: 'Project',
        link: '',
      }],
    });
    expect(result.success).toBe(true);
  });

  it('should reject project with invalid link URL', () => {
    const result = profileDraftSchema.safeParse({
      phone_number: '+33612345678',
      address: 'Paris',
      projects: [{
        name: 'Project',
        link: 'not-a-url',
      }],
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid language proficiency levels', () => {
    const levels = ['Beginner', 'Intermediate', 'Advanced', 'Fluent', 'Native'] as const;
    for (const proficiency of levels) {
      const result = profileDraftSchema.safeParse({
        phone_number: '+33612345678',
        address: 'Paris',
        languages: [{ name: 'English', proficiency }],
      });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid language proficiency level', () => {
    const result = profileDraftSchema.safeParse({
      phone_number: '+33612345678',
      address: 'Paris',
      languages: [{ name: 'English', proficiency: 'Expert' }],
    });
    expect(result.success).toBe(false);
  });

  it('should reject education date year out of range', () => {
    const result = profileDraftSchema.safeParse({
      phone_number: '+33612345678',
      address: 'Paris',
      education: [{
        school: 'MIT',
        degree: 'BS',
        startDate: { year: 1900, month: 1 },
      }],
    });
    expect(result.success).toBe(false);
  });

  it('should reject education date month out of range', () => {
    const result = profileDraftSchema.safeParse({
      phone_number: '+33612345678',
      address: 'Paris',
      education: [{
        school: 'MIT',
        degree: 'BS',
        startDate: { year: 2020, month: 13 },
      }],
    });
    expect(result.success).toBe(false);
  });

  it('should reject more than 50 education entries', () => {
    const result = profileDraftSchema.safeParse({
      phone_number: '+33612345678',
      address: 'Paris',
      education: Array.from({ length: 51 }, () => ({
        school: 'School',
        degree: 'Degree',
      })),
    });
    expect(result.success).toBe(false);
  });

  it('should reject more than 200 skills', () => {
    const result = profileDraftSchema.safeParse({
      phone_number: '+33612345678',
      address: 'Paris',
      skills: Array.from({ length: 201 }, (_, i) => ({
        name: `Skill ${i}`,
      })),
    });
    expect(result.success).toBe(false);
  });

  it('should accept social_links with empty string URLs', () => {
    const result = profileDraftSchema.safeParse({
      phone_number: '+33612345678',
      address: 'Paris',
      social_links: {
        github: '',
        linkedin: '',
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject social_links with invalid URL', () => {
    const result = profileDraftSchema.safeParse({
      phone_number: '+33612345678',
      address: 'Paris',
      social_links: {
        github: 'not-a-url',
      },
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// validateRequest helper
// ============================================================================

describe('validateRequest', () => {
  it('should return data on success', () => {
    const result = validateRequest(
      { email: 'user@example.com', password: 'password123' },
      loginSchema
    );
    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      email: 'user@example.com',
      password: 'password123',
    });
  });

  it('should return validation errors on failure', () => {
    const result = validateRequest(
      { email: 'invalid', password: '' },
      loginSchema
    );
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(400);
    expect(result.error!.message).toBe('Validation failed');
    expect(result.error!.errors).toBeDefined();
    expect(result.error!.errors!.length).toBeGreaterThan(0);
  });

  it('should format error paths correctly', () => {
    const result = validateRequest(
      { email: 'invalid' },
      loginSchema
    );
    expect(result.data).toBeNull();
    const errors = result.error!.errors!;
    const emailError = errors.find(e => e.path === 'email');
    expect(emailError).toBeDefined();
  });

  it('should handle non-ZodError gracefully', () => {
    // Create a schema that throws a non-Zod error
    const throwingSchema = {
      parse: () => { throw new Error('unexpected error'); },
    };
    const result = validateRequest(
      {},
      throwingSchema as unknown as Parameters<typeof validateRequest>[1],
    );
    expect(result.data).toBeNull();
    expect(result.error!.status).toBe(400);
    expect(result.error!.message).toBe('Invalid request data');
  });

  it('should return structured errors with path and message', () => {
    const result = validateRequest(
      {
        phone_number: '+33612345678',
        address: 'Paris',
        education: [{ school: '', degree: '' }],
      },
      profileDraftSchema
    );
    expect(result.data).toBeNull();
    const errors = result.error!.errors!;
    expect(errors.some(e => e.path.includes('education'))).toBe(true);
  });
});
