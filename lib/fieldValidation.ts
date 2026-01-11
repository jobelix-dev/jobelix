/**
 * Server-Side Field Validation
 * 
 * Professional validation functions for phone, email, address, dates, and text fields.
 * Validates format and data integrity (no content policing).
 * Only used when processing pdf using AI extraction on the server, 
 * to classify each field as invalid missing or uncertain.
 * Used by: app/api/student/profile/draft/extract/route.ts
 * Ensures all user input meets proper format requirements before database storage.
 */

export interface ValidationResult {
  isValid: boolean
  errorMessage?: string
  normalizedValue?: any
}

const PHONE_MIN_DIGITS = 10
const PHONE_MAX_DIGITS = 15

/**
 * Validates phone number format
 * Accepts international formats with country codes and various separators
 * 
 * @param value - Phone number string
 * @returns Validation result with normalized value
 */
export function validatePhoneNumber(value: string | null | undefined): ValidationResult {
  if (!value?.trim()) {
    return { isValid: false, errorMessage: 'Phone number is required' }
  }

  const trimmed = value.trim()
  const digitsOnly = trimmed.replace(/\D/g, '')
  
  if (digitsOnly.length < PHONE_MIN_DIGITS) {
    return { 
      isValid: false, 
      errorMessage: `Phone number must contain at least ${PHONE_MIN_DIGITS} digits` 
    }
  }

  if (digitsOnly.length > PHONE_MAX_DIGITS) {
    return { 
      isValid: false, 
      errorMessage: `Phone number cannot exceed ${PHONE_MAX_DIGITS} digits` 
    }
  }

  return { isValid: true, normalizedValue: trimmed }
}

/**
 * Validates email address format using RFC 5322 simplified pattern
 * 
 * @param value - Email address string
 * @returns Validation result with normalized lowercase email
 */
export function validateEmail(value: string | null | undefined): ValidationResult {
  if (!value?.trim()) {
    return { isValid: false, errorMessage: 'Email address is required' }
  }

  const trimmed = value.trim().toLowerCase()
  
  // RFC 5322 Official Standard Email Regex (simplified)
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  if (!emailPattern.test(trimmed)) {
    return { 
      isValid: false, 
      errorMessage: 'Invalid email format. Expected format: user@domain.com' 
    }
  }

  // Additional checks for common issues
  if (trimmed.length > 254) {
    return { isValid: false, errorMessage: 'Email address too long (max 254 characters)' }
  }

  const [localPart, domain] = trimmed.split('@')
  
  if (localPart.length > 64) {
    return { isValid: false, errorMessage: 'Email local part too long (max 64 characters)' }
  }

  if (!domain || domain.length < 3) {
    return { isValid: false, errorMessage: 'Invalid domain in email address' }
  }

  return { isValid: true, normalizedValue: trimmed }
}

const ADDRESS_MIN_LENGTH = 3
const ADDRESS_MAX_LENGTH = 500

/**
 * Validates address field
 * Ensures minimum length for meaningful address data
 * 
 * @param value - Address string
 * @returns Validation result with trimmed address
 */
export function validateAddress(value: string | null | undefined): ValidationResult {
  if (!value?.trim()) {
    return { isValid: false, errorMessage: 'Address is required' }
  }

  const trimmed = value.trim()
  
  if (trimmed.length < ADDRESS_MIN_LENGTH) {
    return { 
      isValid: false, 
      errorMessage: `Address must be at least ${ADDRESS_MIN_LENGTH} characters` 
    }
  }

  if (trimmed.length > ADDRESS_MAX_LENGTH) {
    return { 
      isValid: false, 
      errorMessage: `Address too long (max ${ADDRESS_MAX_LENGTH} characters)` 
    }
  }

  return { isValid: true, normalizedValue: trimmed }
}

const DATE_MIN_YEAR = 1950
const DATE_MAX_YEAR = 2050

const PRESENT_KEYWORDS = ['present', 'current', 'currently', 'ongoing', 'now', 'today']

const MONTH_NAMES: Record<string, string> = {
  january: '01', jan: '01',
  february: '02', feb: '02',
  march: '03', mar: '03',
  april: '04', apr: '04',
  may: '05',
  june: '06', jun: '06',
  july: '07', jul: '07',
  august: '08', aug: '08',
  september: '09', sep: '09', sept: '09',
  october: '10', oct: '10',
  november: '11', nov: '11',
  december: '12', dec: '12'
}

/**
 * Validates and normalizes date input
 * Supports: YYYY, YYYY-MM, YYYY-MM-DD, and natural language (e.g., "May 2020")
 * 
 * @param value - Date string in various formats
 * @param fieldName - Field name for error messages
 * @returns Validation result with normalized date (YYYY, YYYY-MM, or YYYY-MM-DD)
 */
export function validateDate(value: string | null | undefined, fieldName: string = 'date'): ValidationResult {
  if (!value?.trim()) {
    return { 
      isValid: false, 
      errorMessage: `${fieldName} is required. Accepted formats: YYYY, YYYY-MM, or YYYY-MM-DD` 
    }
  }

  const trimmed = value.trim().toLowerCase()
  
  // Handle "present" for ending dates
  if (PRESENT_KEYWORDS.includes(trimmed)) {
    return { isValid: true, normalizedValue: null }
  }

  // Try to parse and normalize the date
  const normalized = normalizeDateString(value)
  
  if (!normalized) {
    return { 
      isValid: false, 
      errorMessage: `Invalid ${fieldName} format. Use: YYYY (e.g., 2020), YYYY-MM (e.g., 2020-05), or YYYY-MM-DD (e.g., 2020-05-15)` 
    }
  }

  return { isValid: true, normalizedValue: normalized }
}

/**
 * Normalizes date string to standard formats
 * Supports: YYYY, YYYY-MM, YYYY-MM-DD, and natural language
 * 
 * @param dateStr - Raw date string
 * @returns Normalized date string or null if invalid
 */
function normalizeDateString(dateStr: string): string | null {
  const trimmed = dateStr.trim()

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number)
    if (!isValidDate(year, month, day)) return null
    return trimmed
  }

  // Year-Month format: YYYY-MM
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const [year, month] = trimmed.split('-').map(Number)
    if (!isValidYearMonth(year, month)) return null
    return trimmed
  }

  // Year only: YYYY
  if (/^\d{4}$/.test(trimmed)) {
    const year = parseInt(trimmed)
    if (year < DATE_MIN_YEAR || year > DATE_MAX_YEAR) return null
    return trimmed
  }

  // Natural language: "May 2020"
  const monthYearMatch = trimmed.match(/^([a-z]+)\s+(\d{4})$/i)
  if (monthYearMatch) {
    const monthName = monthYearMatch[1].toLowerCase()
    const year = monthYearMatch[2]
    const monthNum = MONTH_NAMES[monthName]
    if (monthNum && isValidYearMonth(parseInt(year), parseInt(monthNum))) {
      return `${year}-${monthNum}`
    }
  }

  // Natural language: "Month DD, YYYY" or "DD Month YYYY"
  const fullDateMatch = trimmed.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i) ||
                        trimmed.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i)
  
  if (fullDateMatch) {
    let monthName: string, day: string, year: string
    
    if (/^[a-z]/i.test(fullDateMatch[1])) {
      // "Month DD, YYYY"
      monthName = fullDateMatch[1].toLowerCase()
      day = fullDateMatch[2].padStart(2, '0')
      year = fullDateMatch[3]
    } else {
      // "DD Month YYYY"
      day = fullDateMatch[1].padStart(2, '0')
      monthName = fullDateMatch[2].toLowerCase()
      year = fullDateMatch[3]
    }
    
    const monthNum = MONTH_NAMES[monthName]
    if (monthNum && isValidDate(parseInt(year), parseInt(monthNum), parseInt(day))) {
      return `${year}-${monthNum}-${day}`
    }
  }

  return null
}

/**
 * Validates year and month combination
 */
function isValidYearMonth(year: number, month: number): boolean {
  return year >= DATE_MIN_YEAR && 
         year <= DATE_MAX_YEAR && 
         month >= 1 && 
         month <= 12
}

/**
 * Validates complete date (year, month, day)
 */
function isValidDate(year: number, month: number, day: number): boolean {
  if (!isValidYearMonth(year, month)) return false
  if (day < 1 || day > 31) return false
  
  // Check days in month
  const daysInMonth = new Date(year, month, 0).getDate()
  return day <= daysInMonth
}

const TEXT_MIN_LENGTH = 2
const TEXT_MAX_LENGTH = 200

/**
 * Validates text fields (names, positions, organizations, etc.)
 * Ensures minimum/maximum length constraints
 * 
 * @param value - Text field value
 * @param fieldName - Field name for error messages
 * @returns Validation result with trimmed text
 */
export function validateTextField(value: string | null | undefined, fieldName: string): ValidationResult {
  if (!value?.trim()) {
    return { isValid: false, errorMessage: `${fieldName} is required` }
  }

  const trimmed = value.trim()
  
  if (trimmed.length < TEXT_MIN_LENGTH) {
    return { 
      isValid: false, 
      errorMessage: `${fieldName} must be at least ${TEXT_MIN_LENGTH} characters` 
    }
  }

  if (trimmed.length > TEXT_MAX_LENGTH) {
    return { 
      isValid: false, 
      errorMessage: `${fieldName} too long (max ${TEXT_MAX_LENGTH} characters)` 
    }
  }

  return { isValid: true, normalizedValue: trimmed }
}

/**
 * Routes field validation to appropriate validator based on field type
 * 
 * @param fieldName - Name of the field to validate
 * @param value - Value to validate
 * @returns Validation result from appropriate validator
 */
export function validateField(fieldName: string, value: any): ValidationResult {
  // Phone number validation
  if (fieldName === 'phone_number') {
    return validatePhoneNumber(value)
  }

  // Email validation
  if (fieldName === 'email') {
    return validateEmail(value)
  }

  // Address validation
  if (fieldName === 'address') {
    return validateAddress(value)
  }

  // Date validation (any field containing 'date')
  if (fieldName.includes('date')) {
    const displayName = fieldName.replace(/_/g, ' ')
    return validateDate(value, displayName)
  }

  // Text field validation (positions, organizations, names, etc.)
  const displayName = fieldName.replace(/_/g, ' ')
  return validateTextField(value, displayName)
}
