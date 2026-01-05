/**
 * Draft to Database Mapping Functions
 * 
 * Pure functions that transform student_profile_draft data into 
 * database-ready records for student, academic, and experience tables.
 * 
 * These functions are:
 * - Pure (no side effects)
 * - Testable (deterministic outputs)
 * - Reusable (can be used in different contexts)
 */

import type { ExtractedResumeData, EducationEntry, ExperienceEntry } from './types'

/**
 * Parse full name into first and last name components
 */
function parseName(fullName: string | null | undefined): { firstName: string | null; lastName: string | null } {
  if (!fullName?.trim()) {
    return { firstName: null, lastName: null }
  }
  
  const parts = fullName.trim().split(/\s+/)
  
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null }
  }
  
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  }
}

/**
 * Map draft data to student table record
 */
export function mapDraftToStudent(draft: any, userId: string) {
  const { firstName, lastName } = parseName(draft.student_name)
  
  return {
    id: userId,
    first_name: firstName,
    last_name: lastName,
    phone_number: draft.phone_number || null,
    mail_adress: draft.email || null,
    address: draft.address || null,
  }
}

/**
 * Map draft education entries to academic table records
 */
export function mapDraftToAcademic(draft: any, userId: string): Array<{
  student_id: string
  school_name: string
  degree: string
  description: string | null
  start_year: number
  start_month: number
  end_year: number | null
  end_month: number | null
}> {
  if (!draft.education || !Array.isArray(draft.education) || draft.education.length === 0) {
    return []
  }
  
  return draft.education.map((edu: any) => ({
    student_id: userId,
    school_name: edu.school_name,
    degree: edu.degree,
    description: edu.description || null,
    start_year: edu.start_year,
    start_month: edu.start_month,
    end_year: edu.end_year,
    end_month: edu.end_month,
  }))
}

/**
 * Map draft experience entries to experience table records
 */
export function mapDraftToExperience(draft: any, userId: string): Array<{
  student_id: string
  organisation_name: string
  position_name: string
  description: string | null
  start_year: number
  start_month: number | null
  end_year: number | null
  end_month: number | null
}> {
  if (!draft.experience || !Array.isArray(draft.experience) || draft.experience.length === 0) {
    return []
  }
  
  return draft.experience.map((exp: any) => ({
    student_id: userId,
    organisation_name: exp.organisation_name,
    position_name: exp.position_name,
    description: exp.description || null,
    start_year: exp.start_year,
    start_month: exp.start_month || null,
    end_year: exp.end_year || null,
    end_month: exp.end_month || null,
  }))
}
