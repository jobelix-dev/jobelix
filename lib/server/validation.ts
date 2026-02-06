/**
 * API Input Validation Schemas
 * 
 * Centralized Zod schemas for validating API request bodies.
 * Provides type safety and runtime validation to prevent invalid data.
 */

import "server-only";

import { z } from 'zod';

// ============================================================================
// Auth Validation
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  captchaToken: z.string().optional(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
  captchaToken: z.string().optional(),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['student', 'company'], { message: 'Role must be either "student" or "company"' }),
  captchaToken: z.string().optional(),
});

// ============================================================================
// Work Preferences Validation
// ============================================================================

export const workPreferencesSchema = z.object({
  // Remote work preference
  remote_work: z.boolean().optional(),
  in_person_work: z.boolean().optional(),

  // Experience level booleans
  exp_internship: z.boolean().optional(),
  exp_entry: z.boolean().optional(),
  exp_associate: z.boolean().optional(),
  exp_mid_senior: z.boolean().optional(),
  exp_director: z.boolean().optional(),
  exp_executive: z.boolean().optional(),

  // Job type booleans
  job_full_time: z.boolean().optional(),
  job_part_time: z.boolean().optional(),
  job_contract: z.boolean().optional(),
  job_temporary: z.boolean().optional(),
  job_internship: z.boolean().optional(),
  job_volunteer: z.boolean().optional(),
  job_other: z.boolean().optional(),

  // Date filters
  date_24_hours: z.boolean().optional(),
  date_week: z.boolean().optional(),
  date_month: z.boolean().optional(),
  date_all_time: z.boolean().optional(),

  // Search arrays
  positions: z.array(z.string().max(200)).max(50).optional().default([]),
  locations: z.array(z.string().max(200)).max(50).optional().default([]),
  company_blacklist: z.array(z.string().max(200)).max(100).optional().default([]),
  title_blacklist: z.array(z.string().max(200)).max(100).optional().default([]),

  // Job description language filter (ISO 639-1 codes)
  job_languages: z.array(z.string().length(2)).max(20).optional().default(['en']),

  // Personal/legal information
  date_of_birth: z.string().max(50).optional().nullable(),
  pronouns: z.string().max(50).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  is_veteran: z.boolean().optional(),
  has_disability: z.boolean().optional(),
  ethnicity: z.string().max(100).optional().nullable(),
  eu_work_authorization: z.boolean().optional(),
  us_work_authorization: z.boolean().optional(),
  open_to_relocation: z.boolean().optional(),
  willing_to_complete_assessments: z.boolean().optional(),
  willing_to_undergo_drug_tests: z.boolean().optional(),
  willing_to_undergo_background_checks: z.boolean().optional(),
  notice_period: z.string().max(100).optional().nullable(),
  salary_expectation_usd: z.number().int().min(0).max(10000000).optional().nullable(),
});

// ============================================================================
// Feedback Validation
// ============================================================================

export const feedbackSchema = z.object({
  feedback_type: z.enum(['bug', 'feature']),
  subject: z.string().min(3).max(200).trim(),
  description: z.string().min(10).max(5000).trim(),
  user_email: z.string().email().optional().nullable(),
  user_agent: z.string().max(500).optional().nullable(),
  page_url: z.string().url().max(500).optional().nullable(),
});

// ============================================================================
// Profile Draft Validation
// ============================================================================

const dateSchema = z.object({
  year: z.number().int().min(1950).max(2050).optional().nullable(),
  month: z.number().int().min(1).max(12).optional().nullable(),
});

const educationEntrySchema = z.object({
  id: z.string().uuid().optional(),
  school: z.string().min(1).max(200),
  degree: z.string().min(1).max(200),
  field: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  startDate: dateSchema.optional().nullable(),
  endDate: dateSchema.optional().nullable(),
});

const experienceEntrySchema = z.object({
  id: z.string().uuid().optional(),
  company: z.string().min(1).max(200),
  position: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  startDate: dateSchema.optional().nullable(),
  endDate: dateSchema.optional().nullable(),
});

const projectEntrySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  link: z.string().url().max(500).optional().nullable().or(z.literal('')),
});

const skillEntrySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  slug: z.string().max(100).optional().nullable(),
});

const languageEntrySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  proficiency: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Fluent', 'Native']).optional().nullable(),
});

const publicationEntrySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(300),
  journal: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  date: dateSchema.optional().nullable(),
  link: z.string().url().max(500).optional().nullable().or(z.literal('')),
});

const certificationEntrySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  issuer: z.string().max(200).optional().nullable(),
  url: z.string().url().max(500).optional().nullable().or(z.literal('')),
});

const socialLinksSchema = z.object({
  github: z.string().url().max(500).optional().nullable().or(z.literal('')),
  linkedin: z.string().url().max(500).optional().nullable().or(z.literal('')),
  stackoverflow: z.string().url().max(500).optional().nullable().or(z.literal('')),
  kaggle: z.string().url().max(500).optional().nullable().or(z.literal('')),
  leetcode: z.string().url().max(500).optional().nullable().or(z.literal('')),
});

export const profileDraftSchema = z.object({
  student_name: z.string().max(100).optional().nullable(),
  phone_number: z.string().min(1, 'Phone number is required').max(20),
  email: z.string().email().max(255).optional().nullable(),
  address: z.string().min(1, 'Address is required').max(200),
  education: z.array(educationEntrySchema).max(50).optional().default([]),
  experience: z.array(experienceEntrySchema).max(50).optional().default([]),
  projects: z.array(projectEntrySchema).max(100).optional().default([]),
  skills: z.array(skillEntrySchema).max(200).optional().default([]),
  languages: z.array(languageEntrySchema).max(50).optional().default([]),
  publications: z.array(publicationEntrySchema).max(100).optional().default([]),
  certifications: z.array(certificationEntrySchema).max(100).optional().default([]),
  social_links: socialLinksSchema.optional().default({}),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate request body against a Zod schema
 * Returns validated data or error response
 * 
 * @example
 * const result = validateRequest(requestBody, workPreferencesSchema);
 * if (result.error) return result.error;
 * const validData = result.data;
 */
export function validateRequest<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { data: T; error: null } | { data: null; error: { status: number; message: string; errors?: Array<{ path: string; message: string }> } } {
  try {
    const validated = schema.parse(data);
    return { data: validated, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        data: null,
        error: {
          status: 400,
          message: 'Validation failed',
          errors: error.issues.map((e: z.ZodIssue) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      };
    }
    return {
      data: null,
      error: {
        status: 400,
        message: 'Invalid request data',
      },
    };
  }
}
