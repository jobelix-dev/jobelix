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

import "server-only";

import type { ExtractedResumeData, EducationEntry, ExperienceEntry, ProjectEntry, SkillEntry, LanguageEntry, PublicationEntry, CertificationEntry, SocialLinkEntry } from '../shared/types'

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
    student_name: draft.student_name || null,
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
  
  // Filter out invalid entries and log warnings
  const validEducation = draft.education.filter((edu: any) => {
    const isValid = 
      edu.school_name && 
      edu.degree && 
      edu.start_year && 
      edu.start_month
    
    if (!isValid) {
      console.warn('[mapDraftToAcademic] Filtering out invalid education entry:', {
        school_name: edu.school_name || 'MISSING',
        degree: edu.degree || 'MISSING',
        start_year: edu.start_year || 'MISSING',
        start_month: edu.start_month || 'MISSING',
      })
    }
    
    return isValid
  })
  
  return validEducation.map((edu: any) => ({
    student_id: userId,
    school_name: edu.school_name,
    degree: edu.degree,
    description: edu.description || null,
    start_year: edu.start_year,
    start_month: edu.start_month,
    end_year: edu.end_year || null,
    end_month: edu.end_month || null,
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
  start_month: number
  end_year: number | null
  end_month: number | null
}> {
  if (!draft.experience || !Array.isArray(draft.experience) || draft.experience.length === 0) {
    return []
  }
  
  // Filter out invalid entries and log warnings
  const validExperience = draft.experience.filter((exp: any) => {
    const isValid = 
      exp.organisation_name && 
      exp.position_name && 
      exp.start_year &&
      exp.start_month
    
    if (!isValid) {
      console.warn('[mapDraftToExperience] Filtering out invalid experience entry:', {
        organisation_name: exp.organisation_name || 'MISSING',
        position_name: exp.position_name || 'MISSING',
        start_year: exp.start_year || 'MISSING',
        start_month: exp.start_month || 'MISSING',
      })
    }
    
    return isValid
  })
  
  return validExperience.map((exp: any) => ({
    student_id: userId,
    organisation_name: exp.organisation_name,
    position_name: exp.position_name,
    description: exp.description || null,
    start_year: exp.start_year,
    start_month: exp.start_month,
    end_year: exp.end_year || null,
    end_month: exp.end_month || null,
  }))
}

/**
 * Map draft project entries to project table records
 */
export function mapDraftToProjects(draft: any, userId: string) {
  if (!draft.projects || !Array.isArray(draft.projects) || draft.projects.length === 0) {
    return []
  }
  
  return draft.projects
    .filter((proj: any) => proj.project_name?.trim())
    .map((proj: any) => ({
      student_id: userId,
      project_name: proj.project_name,
      description: proj.description || null,
      link: proj.link || null,
    }))
}

/**
 * Map draft skill entries to skill table records
 */
export function mapDraftToSkills(draft: any, userId: string) {
  if (!draft.skills || !Array.isArray(draft.skills) || draft.skills.length === 0) {
    return []
  }
  
  return draft.skills
    .filter((skill: any) => skill.skill_name?.trim())
    .map((skill: any) => ({
      student_id: userId,
      skill_name: skill.skill_name,
      skill_slug: skill.skill_slug,
    }))
}

/**
 * Map draft language entries to language table records
 */
export function mapDraftToLanguages(draft: any, userId: string) {
  if (!draft.languages || !Array.isArray(draft.languages) || draft.languages.length === 0) {
    return []
  }
  
  return draft.languages
    .filter((lang: any) => lang.language_name?.trim())
    .map((lang: any) => ({
      student_id: userId,
      language_name: lang.language_name,
      proficiency_level: lang.proficiency_level,
    }))
}

/**
 * Map draft publication entries to publication table records
 */
export function mapDraftToPublications(draft: any, userId: string) {
  if (!draft.publications || !Array.isArray(draft.publications) || draft.publications.length === 0) {
    return []
  }
  
  return draft.publications
    .filter((pub: any) => pub.title?.trim())
    .map((pub: any) => ({
      student_id: userId,
      title: pub.title,
      journal_name: pub.journal_name || null,
      description: pub.description || null,
      publication_year: pub.publication_year || null,
      publication_month: pub.publication_month || null,
      link: pub.link || null,
    }))
}

/**
 * Map draft certification entries to certification table records
 */
export function mapDraftToCertifications(draft: any, userId: string) {
  if (!draft.certifications || !Array.isArray(draft.certifications) || draft.certifications.length === 0) {
    return []
  }
  
  return draft.certifications
    .filter((cert: any) => cert.name?.trim())
    .map((cert: any) => ({
      student_id: userId,
      name: cert.name,
      issuing_organization: cert.issuing_organization || null,
      url: cert.url || null,
    }))
}

/**
 * Map draft social links object to social_link table record
 * Now returns a single object with platform-specific columns instead of array
 */
export function mapDraftToSocialLinks(draft: any, userId: string) {
  if (!draft.social_links || typeof draft.social_links !== 'object') {
    return null
  }
  
  const socialLinks = draft.social_links as SocialLinkEntry;
  
  // Return null if all platforms are empty/null
  if (!socialLinks.github && !socialLinks.linkedin && !socialLinks.stackoverflow && 
      !socialLinks.kaggle && !socialLinks.leetcode) {
    return null
  }
  
  return {
    student_id: userId,
    github: socialLinks.github?.trim() || null,
    linkedin: socialLinks.linkedin?.trim() || null,
    stackoverflow: socialLinks.stackoverflow?.trim() || null,
    kaggle: socialLinks.kaggle?.trim() || null,
    leetcode: socialLinks.leetcode?.trim() || null,
  }
}
