/**
 * Client-Side Profile Validation
 * 
 * Validates complete profile data before allowing finalization.
 * Phone validation is simple (presence + min digits) - E.164 normalization happens at finalize time.
 * Used by: StudentDashboard to enable/disable Save button
 */

import type { ExtractedResumeData, EducationEntry, ExperienceEntry, SocialLinkEntry } from '../shared/types'

export interface FieldError {
  field: string
  message: string
}

export interface ProfileValidationResult {
  isValid: boolean
  errors: string[]
  fieldErrors: {
    student_name?: string
    phone_number?: string
    email?: string
    address?: string
    education: Record<number, {
      school_name?: string
      degree?: string
      description?: string
      start_year?: string
      start_month?: string
      end_year?: string
      end_month?: string
    }>
    experience: Record<number, {
      organisation_name?: string
      position_name?: string
      description?: string
      start_year?: string
      start_month?: string
      end_year?: string
      end_month?: string
    }>
    projects?: Record<number, {
      project_name?: string
      description?: string
      link?: string
    }>
    skills?: Record<number, {
      skill_name?: string
      skill_slug?: string
    }>
    languages?: Record<number, {
      language_name?: string
      proficiency_level?: string
    }>
    publications?: Record<number, {
      title?: string
      journal_name?: string
      description?: string
      publication_year?: string
      publication_month?: string
      link?: string
    }>
    certifications?: Record<number, {
      name?: string
      issuing_organization?: string
      description?: string
      issue_year?: string
      issue_month?: string
      expiry_year?: string
      expiry_month?: string
      credential_id?: string
      credential_url?: string
    }>
    social_links?: Record<string, string> // Changed to match new platform-specific structure
  }
}

/**
 * Validates phone number (client-side)
 * Simple validation: requires country code + phone with 4-15 digits
 * E.164 normalization happens at finalize time, not here
 * Phone number is REQUIRED for job applications
 */
function validatePhoneNumber(
  phone: string | null | undefined,
  countryCode: string | null | undefined
): string | null {
  // Country code is required
  if (!countryCode?.trim()) {
    return 'Country code is required';
  }
  
  // Phone is required
  if (!phone?.trim()) {
    return 'Phone number is required';
  }
  
  // Extract digits only
  const digits = phone.replace(/\D/g, '');
  
  // Minimum 4 digits (shortest valid phone numbers)
  if (digits.length < 4) {
    return 'Phone number is too short';
  }
  
  // Maximum 15 digits (E.164 limit)
  if (digits.length > 15) {
    return 'Phone number is too long';
  }
  
  return null;
}

/**
 * Validates email format (client-side)
 */
function validateEmail(value: string | null | undefined): string | null {
  if (!value?.trim()) return 'Required'
  
  const trimmed = value.trim().toLowerCase()
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  if (!emailPattern.test(trimmed)) return 'Invalid email format'
  if (trimmed.length > 254) return 'Email address too long'
  
  return null
}

/**
 * Validates address (client-side)
 * Address is REQUIRED for job applications (city/location)
 */
function validateAddress(value: string | null | undefined): string | null {
  if (!value?.trim()) return 'Address is required'
  
  const trimmed = value.trim()
  if (trimmed.length > 500) return 'Address too long'
  
  return null
}

/**
 * Validates text field (name, school, position, etc.)
 */
function validateTextField(value: string | null | undefined, fieldName: string): string | null {
  if (!value?.trim()) return 'Required'
  
  const trimmed = value.trim()
  if (trimmed.length > 200) return `${fieldName} too long`
  
  return null
}

/**
 * Validates date fields (year and month)
 */
function validateDateFields(
  year: number | null | undefined,
  month: number | null | undefined,
  fieldName: string
): string | null {
  // Year is required
  if (!year) return `${fieldName}: Required`
  
  // Month is required
  if (!month) return `${fieldName}: Required`
  
  // Validate year range
  if (year < 1950 || year > 2050) {
    return `${fieldName}: Year must be between 1950 and 2050`
  }
  
  // Validate month range
  if (month < 1 || month > 12) {
    return `${fieldName}: Month must be between 1 and 12`
  }
  
  return null
}

/**
 * Get inline error message for date fields
 */
function getDateFieldsError(
  year: number | null | undefined,
  month: number | null | undefined,
  fieldLabel: string
): { year?: string; month?: string } {
  const errors: { year?: string; month?: string } = {}
  
  const isEnd = fieldLabel.toLowerCase().includes('end')
  const isStart = fieldLabel.toLowerCase().includes('start')
  
  if (!year) {
    errors.year = isEnd ? 'End year required' : isStart ? 'Start year required' : 'Year required'
  } else if (year < 1950 || year > 2050) {
    errors.year = 'Year must be between 1950 and 2050'
  }
  
  if (!month) {
    errors.month = isEnd ? 'End month required' : isStart ? 'Start month required' : 'Month required'
  } else if (month < 1 || month > 12) {
    errors.month = 'Month must be between 1 and 12'
  }
  
  return errors
}

/**
 * Validates that end date is not before start date
 */
function validateDateRange(
  startYear: number | null | undefined,
  startMonth: number | null | undefined,
  endYear: number | null | undefined,
  endMonth: number | null | undefined
): string | null {
  // Only validate if all fields are present
  if (!startYear || !startMonth || !endYear || !endMonth) return null
  
  // Convert to comparable format (YYYYMM)
  const startDate = startYear * 100 + startMonth
  const endDate = endYear * 100 + endMonth
  
  if (endDate < startDate) {
    return 'End date cannot be before start date'
  }
  
  return null
}

/**
 * Validates single education entry
 */
function _validateEducation(edu: EducationEntry, index: number): string[] {
  const errors: string[] = []
  
  const schoolError = validateTextField(edu.school_name, `Education ${index + 1} - School`)
  if (schoolError) errors.push(schoolError)
  
  const degreeError = validateTextField(edu.degree, `Education ${index + 1} - Degree`)
  if (degreeError) errors.push(degreeError)
  
  const startDateError = validateDateFields(edu.start_year, edu.start_month, `Education ${index + 1} - Start date`)
  if (startDateError) errors.push(startDateError)
  
  const endDateError = validateDateFields(edu.end_year, edu.end_month, `Education ${index + 1} - End date`)
  if (endDateError) errors.push(endDateError)
  
  return errors
}

/**
 * Validates single experience entry
 */
function _validateExperience(exp: ExperienceEntry, index: number): string[] {
  const errors: string[] = []
  
  const companyError = validateTextField(exp.organisation_name, `Experience ${index + 1} - Company`)
  if (companyError) errors.push(companyError)
  
  const positionError = validateTextField(exp.position_name, `Experience ${index + 1} - Position`)
  if (positionError) errors.push(positionError)
  
  const startDateError = validateDateFields(exp.start_year, exp.start_month, `Experience ${index + 1} - Start date`)
  if (startDateError) errors.push(startDateError)
  
  const endDateError = validateDateFields(exp.end_year, exp.end_month, `Experience ${index + 1} - End date`)
  if (endDateError) errors.push(endDateError)
  
  return errors
}

/**
 * Validates complete profile data
 * Returns isValid flag and array of error messages + structured field errors
 */
export function validateProfile(data: ExtractedResumeData): ProfileValidationResult {
  const errors: string[] = []
  const fieldErrors: ProfileValidationResult['fieldErrors'] = {
    education: {},
    experience: {},
    projects: {},
    skills: {},
    languages: {},
    publications: {},
    certifications: {},
    social_links: {}
  }
  
  // Validate basic contact info
  const nameError = validateTextField(data.student_name, 'Student name')
  if (nameError) {
    errors.push(nameError)
    fieldErrors.student_name = nameError
  }
  
  const phoneError = validatePhoneNumber(data.phone_number, data.phone_country_code)
  if (phoneError) {
    errors.push(phoneError)
    fieldErrors.phone_number = phoneError
  }
  
  const emailError = validateEmail(data.email)
  if (emailError) {
    errors.push(emailError)
    fieldErrors.email = emailError
  }
  
  const addressError = validateAddress(data.address)
  if (addressError) {
    errors.push(addressError)
    fieldErrors.address = addressError
  }
  
  // Validate education entries (optional - no minimum required)
  if (data.education && data.education.length > 0) {
    data.education.forEach((edu, index) => {
      fieldErrors.education[index] = {}
      
      const schoolError = validateTextField(edu.school_name, `Education ${index + 1} - School`)
      if (schoolError) {
        errors.push(schoolError)
        fieldErrors.education[index].school_name = 'Required'
      }
      
      const degreeError = validateTextField(edu.degree, `Education ${index + 1} - Degree`)
      if (degreeError) {
        errors.push(degreeError)
        fieldErrors.education[index].degree = 'Required'
      }
      
      const startDateError = validateDateFields(edu.start_year, edu.start_month, `Education ${index + 1} - Start date`)
      if (startDateError) {
        errors.push(startDateError)
        const dateErrors = getDateFieldsError(edu.start_year, edu.start_month, 'Start date')
        if (dateErrors.year) fieldErrors.education[index].start_year = dateErrors.year
        if (dateErrors.month) fieldErrors.education[index].start_month = dateErrors.month
      }
      
      const endDateError = validateDateFields(edu.end_year, edu.end_month, `Education ${index + 1} - End date`)
      if (endDateError) {
        errors.push(endDateError)
        const dateErrors = getDateFieldsError(edu.end_year, edu.end_month, 'End date')
        if (dateErrors.year) fieldErrors.education[index].end_year = dateErrors.year
        if (dateErrors.month) fieldErrors.education[index].end_month = dateErrors.month
      }
      
      // Validate date range (end must be after or equal to start)
      const rangeError = validateDateRange(edu.start_year, edu.start_month, edu.end_year, edu.end_month)
      if (rangeError) {
        errors.push(`Education ${index + 1}: ${rangeError}`)
        if (!fieldErrors.education[index].end_year && !fieldErrors.education[index].end_month) {
          fieldErrors.education[index].end_year = rangeError
        }
      }
    })
  }
  
  // Validate experience entries (optional but if provided must be valid)
  if (data.experience && data.experience.length > 0) {
    data.experience.forEach((exp, index) => {
      fieldErrors.experience[index] = {}
      
      const companyError = validateTextField(exp.organisation_name, `Experience ${index + 1} - Company`)
      if (companyError) {
        errors.push(companyError)
        fieldErrors.experience[index].organisation_name = 'Required'
      }
      
      const positionError = validateTextField(exp.position_name, `Experience ${index + 1} - Position`)
      if (positionError) {
        errors.push(positionError)
        fieldErrors.experience[index].position_name = 'Required'
      }
      
      const startDateError = validateDateFields(exp.start_year, exp.start_month, `Experience ${index + 1} - Start date`)
      if (startDateError) {
        errors.push(startDateError)
        const dateErrors = getDateFieldsError(exp.start_year, exp.start_month, 'Start date')
        if (dateErrors.year) fieldErrors.experience[index].start_year = dateErrors.year
        if (dateErrors.month) fieldErrors.experience[index].start_month = dateErrors.month
      }
      
      const endDateError = validateDateFields(exp.end_year, exp.end_month, `Experience ${index + 1} - End date`)
      if (endDateError) {
        errors.push(endDateError)
        const dateErrors = getDateFieldsError(exp.end_year, exp.end_month, 'End date')
        if (dateErrors.year) fieldErrors.experience[index].end_year = dateErrors.year
        if (dateErrors.month) fieldErrors.experience[index].end_month = dateErrors.month
      }
      
      // Validate date range (end must be after or equal to start)
      const rangeError = validateDateRange(exp.start_year, exp.start_month, exp.end_year, exp.end_month)
      if (rangeError) {
        errors.push(`Experience ${index + 1}: ${rangeError}`)
        if (!fieldErrors.experience[index].end_year && !fieldErrors.experience[index].end_month) {
          fieldErrors.experience[index].end_year = rangeError
        }
      }
    })
  }
  
  // Validate projects (optional, but if provided must have a name)
  if (data.projects && data.projects.length > 0) {
    data.projects.forEach((project, index) => {
      const nameError = validateTextField(project.project_name, `Project ${index + 1} - Name`)
      if (nameError) {
        if (!fieldErrors.projects) fieldErrors.projects = {}
        fieldErrors.projects[index] = { project_name: 'Required' }
        errors.push(nameError)
      }
    })
  }
  
  // Validate skills (optional, but if provided must have a name)
  if (data.skills && data.skills.length > 0) {
    data.skills.forEach((skill, index) => {
      const nameError = validateTextField(skill.skill_name, `Skill ${index + 1} - Name`)
      if (nameError) {
        if (!fieldErrors.skills) fieldErrors.skills = {}
        fieldErrors.skills[index] = { skill_name: 'Required' }
        errors.push(nameError)
      }
      
      // Slug is optional, skip validation
    })
  }
  
  // Validate languages (optional, but if provided must have a name)
  if (data.languages && data.languages.length > 0) {
    data.languages.forEach((language, index) => {
      const nameError = validateTextField(language.language_name, `Language ${index + 1} - Name`)
      if (nameError) {
        if (!fieldErrors.languages) fieldErrors.languages = {}
        fieldErrors.languages[index] = { language_name: 'Required' }
        errors.push(nameError)
      }
    })
  }
  
  // Validate publications (optional, but if provided must have a title)
  if (data.publications && data.publications.length > 0) {
    data.publications.forEach((pub, index) => {
      const titleError = validateTextField(pub.title, `Publication ${index + 1} - Title`)
      if (titleError) {
        if (!fieldErrors.publications) fieldErrors.publications = {}
        fieldErrors.publications[index] = { title: 'Required' }
        errors.push(titleError)
      }
    })
  }
  
  // Validate certifications (optional, but if provided must have a name)
  if (data.certifications && data.certifications.length > 0) {
    data.certifications.forEach((cert, index) => {
      const nameError = validateTextField(cert.name, `Certification ${index + 1} - Name`)
      if (nameError) {
        if (!fieldErrors.certifications) fieldErrors.certifications = {}
        fieldErrors.certifications[index] = { name: 'Required' }
        errors.push(nameError)
      }
    })
  }
  
  // Validate social links (optional, but if provided must be valid URLs)
  if (data.social_links) {
    const platforms: Array<keyof SocialLinkEntry> = ['github', 'linkedin', 'stackoverflow', 'kaggle', 'leetcode'];
    
    platforms.forEach((platform) => {
      const url = data.social_links[platform];
      if (url && url.trim()) {
        // Basic URL validation
        try {
          new URL(url);
        } catch {
          if (!fieldErrors.social_links) fieldErrors.social_links = {};
          fieldErrors.social_links[platform] = 'Invalid URL format';
          errors.push(`${platform.charAt(0).toUpperCase() + platform.slice(1)} - Invalid URL format`);
        }
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors
  }
}
