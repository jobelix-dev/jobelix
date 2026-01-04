/**
 * Client-Side Profile Validation
 * 
 * Validates complete profile data before allowing finalization.
 * Uses same validation logic as server-side but runs in browser.
 * Used by: StudentDashboard to enable/disable Save button
 */

import type { ExtractedResumeData, EducationEntry, ExperienceEntry } from './types'

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
  }
}

/**
 * Validates phone number format (client-side)
 */
function validatePhoneNumber(value: string | null | undefined): string | null {
  if (!value?.trim()) return 'Phone number is required'
  
  const digitsOnly = value.trim().replace(/\D/g, '')
  
  if (digitsOnly.length < 10) return 'Phone number must contain at least 10 digits'
  if (digitsOnly.length > 15) return 'Phone number cannot exceed 15 digits'
  
  return null
}

/**
 * Validates email format (client-side)
 */
function validateEmail(value: string | null | undefined): string | null {
  if (!value?.trim()) return 'Email address is required'
  
  const trimmed = value.trim().toLowerCase()
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  if (!emailPattern.test(trimmed)) return 'Invalid email format'
  if (trimmed.length > 254) return 'Email address too long'
  
  return null
}

/**
 * Validates address (optional but if provided must be valid)
 */
function validateAddress(value: string | null | undefined): string | null {
  if (!value?.trim()) return null // Address is optional
  
  const trimmed = value.trim()
  if (trimmed.length < 3) return 'Address must be at least 3 characters'
  if (trimmed.length > 500) return 'Address too long'
  
  return null
}

/**
 * Validates text field (name, school, position, etc.)
 */
function validateTextField(value: string | null | undefined, fieldName: string): string | null {
  if (!value?.trim()) return `${fieldName} is required`
  
  const trimmed = value.trim()
  if (trimmed.length < 2) return `${fieldName} must be at least 2 characters`
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
  if (!year) return `${fieldName}: Year is required`
  
  // Month is required
  if (!month) return `${fieldName}: Month is required`
  
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
    errors.year = isEnd ? 'End year is required' : isStart ? 'Start year is required' : 'Year is required'
  } else if (year < 1950 || year > 2050) {
    errors.year = 'Year must be between 1950 and 2050'
  }
  
  if (!month) {
    errors.month = isEnd ? 'End month is required' : isStart ? 'Start month is required' : 'Month is required'
  } else if (month < 1 || month > 12) {
    errors.month = 'Month must be between 1 and 12'
  }
  
  return errors
}

/**
 * Validates single education entry
 */
function validateEducation(edu: EducationEntry, index: number): string[] {
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
function validateExperience(exp: ExperienceEntry, index: number): string[] {
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
    experience: {}
  }
  
  // Validate basic contact info
  const nameError = validateTextField(data.student_name, 'Student name')
  if (nameError) {
    errors.push(nameError)
    fieldErrors.student_name = nameError
  }
  
  const phoneError = validatePhoneNumber(data.phone_number)
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
  
  // Validate education entries
  if (!data.education || data.education.length === 0) {
    errors.push('At least one education entry is required')
  } else {
    data.education.forEach((edu, index) => {
      fieldErrors.education[index] = {}
      
      const schoolError = validateTextField(edu.school_name, `Education ${index + 1} - School`)
      if (schoolError) {
        errors.push(schoolError)
        fieldErrors.education[index].school_name = 'School name is required'
      }
      
      const degreeError = validateTextField(edu.degree, `Education ${index + 1} - Degree`)
      if (degreeError) {
        errors.push(degreeError)
        fieldErrors.education[index].degree = 'Degree is required'
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
    })
  }
  
  // Validate experience entries (optional but if provided must be valid)
  if (data.experience && data.experience.length > 0) {
    data.experience.forEach((exp, index) => {
      fieldErrors.experience[index] = {}
      
      const companyError = validateTextField(exp.organisation_name, `Experience ${index + 1} - Company`)
      if (companyError) {
        errors.push(companyError)
        fieldErrors.experience[index].organisation_name = 'Company name is required'
      }
      
      const positionError = validateTextField(exp.position_name, `Experience ${index + 1} - Position`)
      if (positionError) {
        errors.push(positionError)
        fieldErrors.experience[index].position_name = 'Position is required'
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
    })
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors
  }
}
