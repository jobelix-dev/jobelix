import { z } from 'zod'

// Schema for a single education entry
export const EducationSchema = z.object({
  school_name: z.string().describe('Name of the educational institution'),
  degree: z.string().describe('Degree name and field of study'),
  description: z.string().nullable().describe('Additional details like GPA, honors, coursework'),
  starting_date: z.string().nullable().describe('Start date in YYYY-MM or YYYY format'),
  ending_date: z.string().nullable().describe('End date in YYYY-MM or YYYY format, null if current'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of extracted data'),
})

// Schema for a single work experience entry
export const ExperienceSchema = z.object({
  organisation_name: z.string().describe('Company or organization name'),
  position_name: z.string().describe('Job title or position'),
  description: z.string().nullable().describe('Responsibilities, achievements, or key tasks'),
  starting_date: z.string().nullable().describe('Start date in YYYY-MM or YYYY format'),
  ending_date: z.string().nullable().describe('End date in YYYY-MM or YYYY format, null if current'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of extracted data'),
})

// Complete resume extraction schema
export const ResumeExtractionSchema = z.object({
  student_name: z.string().nullable().describe('Full name of the student'),
  education: z.array(EducationSchema).describe('Array of educational background entries'),
  experience: z.array(ExperienceSchema).describe('Array of work experience entries'),
  missing_fields: z.array(z.string()).describe('List of important fields that could not be found'),
  uncertain_fields: z.array(z.string()).describe('List of fields where extraction confidence is low'),
})

export type ResumeExtraction = z.infer<typeof ResumeExtractionSchema>
export type Education = z.infer<typeof EducationSchema>
export type Experience = z.infer<typeof ExperienceSchema>
