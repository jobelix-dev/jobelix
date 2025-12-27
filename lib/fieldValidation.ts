/**
 * Server-side field validation utilities
 * All validation happens here - never trust client/GPT input
 */

export interface ValidationResult {
  isValid: boolean
  errorMessage?: string
  normalizedValue?: any
}

/**
 * Validate phone number
 */
export function validatePhoneNumber(value: string | null | undefined): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, errorMessage: 'Phone number is required' }
  }

  const trimmed = value.trim().toLowerCase()
  
  // Reject vague responses
  const vagueResponses = ['idk', 'dunno', 'none', 'n/a', 'na', 'no', 'nope', 'empty', 'skip']
  if (vagueResponses.includes(trimmed)) {
    return { isValid: false, errorMessage: 'Please provide a valid phone number or type "skip" if you prefer not to provide one' }
  }

  // Extract digits only
  const digitsOnly = value.replace(/\D/g, '')
  
  // Must have at least 10 digits
  if (digitsOnly.length < 10) {
    return { isValid: false, errorMessage: 'Phone number must contain at least 10 digits' }
  }

  // Too long
  if (digitsOnly.length > 15) {
    return { isValid: false, errorMessage: 'Phone number cannot exceed 15 digits' }
  }

  return { isValid: true, normalizedValue: value.trim() }
}

/**
 * Validate email address
 */
export function validateEmail(value: string | null | undefined): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, errorMessage: 'Email address is required' }
  }

  const trimmed = value.trim().toLowerCase()
  
  // Reject vague responses
  const vagueResponses = ['idk', 'dunno', 'none', 'n/a', 'na', 'no', 'nope', 'empty', 'skip']
  if (vagueResponses.includes(trimmed)) {
    return { isValid: false, errorMessage: 'Please provide a valid email address' }
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, errorMessage: 'Please provide a valid email address (e.g., user@example.com)' }
  }

  return { isValid: true, normalizedValue: trimmed }
}

/**
 * Validate address
 */
export function validateAddress(value: string | null | undefined): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, errorMessage: 'Address is required' }
  }

  const trimmed = value.trim().toLowerCase()
  
  // Reject vague responses
  const vagueResponses = ['idk', 'dunno', 'none', 'n/a', 'na', 'no', 'nope', 'empty', 'skip', 'somewhere']
  if (vagueResponses.includes(trimmed)) {
    return { isValid: false, errorMessage: 'Please provide a valid address (city, street, or country)' }
  }

  // Must be at least 3 characters
  if (value.trim().length < 3) {
    return { isValid: false, errorMessage: 'Please provide a valid address' }
  }

  return { isValid: true, normalizedValue: value.trim() }
}

/**
 * Validate and normalize date
 * Accepts: YYYY, YYYY-MM, YYYY-MM-DD, natural language like "May 2020"
 * Returns normalized date in YYYY, YYYY-MM, or YYYY-MM-DD format
 */
export function validateDate(value: string | null | undefined, fieldName: string = 'date'): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, errorMessage: `${fieldName} is required (e.g., 2020, May 2020, or 2020-05-15)` }
  }

  const trimmed = value.trim().toLowerCase()
  
  // Accept "present", "current", "ongoing", "now" for ending dates
  const presentKeywords = ['present', 'current', 'currently', 'ongoing', 'now', 'today']
  if (presentKeywords.includes(trimmed)) {
    return { isValid: true, normalizedValue: null } // null means ongoing
  }

  // Reject vague responses
  const vagueResponses = ['idk', 'dunno', 'recently', 'a while ago', 'last year', 'soon', 'sometime', 'maybe']
  if (vagueResponses.some(vague => trimmed.includes(vague))) {
    return { isValid: false, errorMessage: `Please provide a specific ${fieldName} (e.g., 2020, May 2020, or 2020-05-15)` }
  }

  // Try to parse the date
  const normalized = normalizeDateString(value)
  
  if (!normalized) {
    return { 
      isValid: false, 
      errorMessage: `Invalid ${fieldName} format. Please use YYYY (e.g., 2020), YYYY-MM (e.g., 2020-05), or YYYY-MM-DD (e.g., 2020-05-15)` 
    }
  }

  return { isValid: true, normalizedValue: normalized }
}

/**
 * Normalize date string to YYYY, YYYY-MM, or YYYY-MM-DD
 */
function normalizeDateString(dateStr: string): string | null {
  const trimmed = dateStr.trim()

  // Already in correct format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // Already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // Just year YYYY
  if (/^\d{4}$/.test(trimmed)) {
    const year = parseInt(trimmed)
    if (year < 1950 || year > 2050) return null
    return trimmed
  }

  // Try to parse natural language dates like "May 2020", "September 2023"
  const monthNames = {
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

  // Try "Month YYYY" format
  const monthYearMatch = trimmed.match(/^([a-z]+)\s+(\d{4})$/i)
  if (monthYearMatch) {
    const monthName = monthYearMatch[1].toLowerCase()
    const year = monthYearMatch[2]
    const monthNum = monthNames[monthName as keyof typeof monthNames]
    if (monthNum) {
      return `${year}-${monthNum}`
    }
  }

  // Try "Month DD, YYYY" format
  const fullDateMatch = trimmed.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i)
  if (fullDateMatch) {
    const monthName = fullDateMatch[1].toLowerCase()
    const day = fullDateMatch[2].padStart(2, '0')
    const year = fullDateMatch[3]
    const monthNum = monthNames[monthName as keyof typeof monthNames]
    if (monthNum) {
      return `${year}-${monthNum}-${day}`
    }
  }

  // Try "DD Month YYYY" format
  const dayMonthYearMatch = trimmed.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i)
  if (dayMonthYearMatch) {
    const day = dayMonthYearMatch[1].padStart(2, '0')
    const monthName = dayMonthYearMatch[2].toLowerCase()
    const year = dayMonthYearMatch[3]
    const monthNum = monthNames[monthName as keyof typeof monthNames]
    if (monthNum) {
      return `${year}-${monthNum}-${day}`
    }
  }

  return null
}

/**
 * Validate any text field (organization name, position, etc.)
 */
export function validateTextField(value: string | null | undefined, fieldName: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, errorMessage: `${fieldName} is required` }
  }

  const trimmed = value.trim().toLowerCase()
  
  // Reject vague responses
  const vagueResponses = ['idk', 'dunno', 'none', 'n/a', 'na', 'no', 'nope', 'empty', 'skip', 'stuff', 'things']
  if (vagueResponses.includes(trimmed)) {
    return { isValid: false, errorMessage: `Please provide a valid ${fieldName}` }
  }

  // Must be at least 2 characters
  if (value.trim().length < 2) {
    return { isValid: false, errorMessage: `${fieldName} must be at least 2 characters long` }
  }

  return { isValid: true, normalizedValue: value.trim() }
}

/**
 * Validate a field based on its type
 */
export function validateField(fieldName: string, value: any): ValidationResult {
  // Phone number
  if (fieldName === 'phone_number') {
    return validatePhoneNumber(value)
  }

  // Email
  if (fieldName === 'email') {
    return validateEmail(value)
  }

  // Address
  if (fieldName === 'address') {
    return validateAddress(value)
  }

  // Dates
  if (fieldName.includes('date')) {
    const displayName = fieldName.replace(/_/g, ' ')
    return validateDate(value, displayName)
  }

  // Position/organization names
  if (fieldName === 'position_name' || fieldName === 'organisation_name') {
    const displayName = fieldName.replace(/_/g, ' ')
    return validateTextField(value, displayName)
  }

  // Default text validation
  const displayName = fieldName.replace(/_/g, ' ')
  return validateTextField(value, displayName)
}
