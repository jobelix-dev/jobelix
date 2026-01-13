/**
 * Resume Data Schema Definitions
 * 
 * Defines Zod schemas for structured resume data extraction from OpenAI GPT-4o.
 * Used by: app/api/student/profile/draft/extract/route.ts for AI-powered parsing.
 * Schemas validate education, experience, and personal info with confidence levels.
 */

import "server-only";

import { z } from 'zod'

// Schema for a single education entry
export const EducationSchema = z.object({
  school_name: z.string().describe('Name of the educational institution'),
  degree: z.string().describe('Degree name and field of study'),
  description: z.string().nullable().describe('Additional details like GPA, honors, coursework'),
  start_year: z.number().nullable().describe('Start year (e.g., 2020)'),
  start_month: z.number().nullable().describe('Start month (1-12)'),
  end_year: z.number().nullable().describe('End year, null if currently studying'),
  end_month: z.number().nullable().describe('End month (1-12), null if currently studying'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of extracted data'),
})

// Schema for a single work experience entry
export const ExperienceSchema = z.object({
  organisation_name: z.string().describe('Company or organization name'),
  position_name: z.string().describe('Job title or position'),
  description: z.string().nullable().describe('Responsibilities, achievements, or key tasks'),
  start_year: z.number().nullable().describe('Start year (e.g., 2020)'),
  start_month: z.number().nullable().describe('Start month (1-12)'),
  end_year: z.number().nullable().describe('End year, null if currently working'),
  end_month: z.number().nullable().describe('End month (1-12), null if currently working'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of extracted data'),
})

// Schema for a single project entry
export const ProjectSchema = z.object({
  project_name: z.string().describe('Name of the project'),
  description: z.string().nullable().describe('Brief description of the project'),
  link: z.string().nullable().describe('URL to project (GitHub, live demo, etc.)'),
})

// Schema for a single skill entry
export const SkillSchema = z.object({
  skill_name: z.string().describe('Name of the skill or technology'),
  skill_slug: z.string().describe('Lowercase slug version (e.g., "javascript", "python")'),
})

// Schema for a single language entry
export const LanguageSchema = z.object({
  language_name: z.string().describe('Name of the language'),
  proficiency_level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Fluent', 'Native']).describe('Proficiency level'),
})

// Schema for a single publication entry
export const PublicationSchema = z.object({
  title: z.string().describe('Title of the publication'),
  journal_name: z.string().nullable().describe('Name of the journal or conference'),
  description: z.string().nullable().describe('Brief description or abstract'),
  publication_year: z.number().nullable().describe('Publication year (e.g., 2024)'),
  publication_month: z.number().nullable().describe('Publication month (1-12)'),
  link: z.string().nullable().describe('URL to the publication'),
})

// Schema for a single certification entry
export const CertificationSchema = z.object({
  name: z.string().describe('Name of the certification or award'),
  issuing_organization: z.string().nullable().describe('Organization that issued it'),
  url: z.string().nullable().describe('URL to verify or view the credential'),
})

// Schema for social links - specific platforms only
export const SocialLinkSchema = z.object({
  github: z.string().nullable().optional().describe('GitHub profile URL'),
  linkedin: z.string().nullable().optional().describe('LinkedIn profile URL'),
  stackoverflow: z.string().nullable().optional().describe('Stack Overflow profile URL'),
  kaggle: z.string().nullable().optional().describe('Kaggle profile URL'),
  leetcode: z.string().nullable().optional().describe('LeetCode profile URL'),
})

// Complete resume extraction schema
export const ResumeExtractionSchema = z.object({
  student_name: z.string().nullable().describe('Full name of the student'),
  phone_number: z.string().nullable().describe('Phone number or mobile number'),
  email: z.string().nullable().describe('Email address'),
  address: z.string().nullable().describe('Physical address or location'),
  education: z.array(EducationSchema).describe('Array of educational background entries'),
  experience: z.array(ExperienceSchema).describe('Array of work experience entries'),
  projects: z.array(ProjectSchema).describe('Array of personal or academic projects'),
  skills: z.array(SkillSchema).describe('Array of technical skills and technologies'),
  languages: z.array(LanguageSchema).describe('Array of spoken languages'),
  publications: z.array(PublicationSchema).describe('Array of publications or research papers'),
  certifications: z.array(CertificationSchema).describe('Array of certifications and awards'),
  social_links: SocialLinkSchema.describe('Social media profiles - GitHub, LinkedIn, StackOverflow, Kaggle, LeetCode'),
})

// Schema for individual field update
export const FieldUpdateSchema = z.object({
  field_name: z.string().describe('The name of the field being updated (e.g., "phone_number", "email", "address")'),
  field_value: z.string().describe('The validated value provided by the user'),
})

// Schema for uncertain field with structured reference
export const UncertainFieldSchema = z.object({
  field_path: z.string().describe('JSON path to the field: "phone_number" for top-level, "education.0.starting_date" for nested'),
  display_name: z.string().describe('Human-readable description: "phone number", "Institut Polytechnique starting date"'),
  context: z.string().optional().describe('Additional context like organization/school name'),
})

// Schema for chat validation updates
export const ChatUpdateSchema = z.object({
  message: z.string().describe('Friendly message to the user. If their answer was unclear or invalid, explain what format you need and ask again.'),
  field_updates: z.array(FieldUpdateSchema).describe('Array of field updates - ONLY include fields where user provided CLEAR, VALID data. Use empty array [] if no valid data was provided. If answer was vague ("idk", "maybe", unclear), use empty array and set validation_failed to true.'),
  resolved_field_path: z.string().describe('The field_path of the uncertain field that was just resolved. Empty string if none. Example: "experience.2.ending_date"'),
  is_complete: z.boolean().describe('True if all missing and uncertain fields are now resolved with VALID data'),
  validation_failed: z.boolean().describe('True if the user provided an invalid or unclear answer that needs clarification. False otherwise.'),
})

export type ResumeExtraction = z.infer<typeof ResumeExtractionSchema>
export type Education = z.infer<typeof EducationSchema>
export type Experience = z.infer<typeof ExperienceSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Skill = z.infer<typeof SkillSchema>
export type Language = z.infer<typeof LanguageSchema>
export type Publication = z.infer<typeof PublicationSchema>
export type Certification = z.infer<typeof CertificationSchema>
export type SocialLink = z.infer<typeof SocialLinkSchema>
export type ChatUpdate = z.infer<typeof ChatUpdateSchema>
