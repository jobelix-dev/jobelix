/**
 * Resume Model - Loads and manages resume data from YAML
 * 
 * Mirrors the Python Resume class for compatibility.
 */

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import type { 
  Resume, 
  PersonalInformation, 
  SelfIdentification,
  LegalAuthorization,
  WorkPreferences,
  Education,
  Experience,
  Availability,
  SalaryExpectations,
  Language 
} from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('ResumeModel');

/**
 * Load and parse a resume from YAML file
 */
export function loadResume(resumePath: string): Resume {
  log.info(`Loading resume from: ${resumePath}`);
  
  if (!fs.existsSync(resumePath)) {
    throw new Error(`Resume file not found: ${resumePath}`);
  }

  const content = fs.readFileSync(resumePath, 'utf-8');
  return parseResumeYaml(content);
}

/**
 * Parse resume YAML content into Resume object
 */
export function parseResumeYaml(content: string): Resume {
  const data = yaml.load(content) as Record<string, unknown>;
  
  // Handle both new JSON Resume format and legacy format
  const basics = (data.basics || data.personal_information || {}) as Record<string, unknown>;
  const work = (data.work || data.experience_details || []) as Record<string, unknown>[];
  const education = (data.education || data.education_details || []) as Record<string, unknown>[];
  
  const resume: Resume = {
    personalInformation: parsePersonalInformation(basics, data),
    selfIdentification: parseSelfIdentification(data.self_identification as Record<string, unknown>),
    legalAuthorization: parseLegalAuthorization(data.legal_authorization as Record<string, unknown>),
    workPreferences: parseWorkPreferences(data.work_preferences as Record<string, unknown>),
    educationDetails: education.map(parseEducation),
    experienceDetails: work.map(parseExperience),
    availability: parseAvailability(data.availability as Record<string, unknown>),
    salaryExpectations: parseSalaryExpectations(data.salary_expectations as Record<string, unknown>),
    languages: parseLanguages(data.languages as Record<string, unknown>[]),
    interests: data.interests as string | undefined,
    achievements: data.achievements as string[] | undefined,
    certifications: data.certifications as string[] | undefined,
    skills: parseSkills(data.skills),
  };

  log.info(`Resume loaded: ${resume.personalInformation.name} ${resume.personalInformation.surname}`);
  return resume;
}

function parsePersonalInformation(basics: Record<string, unknown>, _root: Record<string, unknown>): PersonalInformation {
  const location = (basics.location || {}) as Record<string, unknown>;
  const phone = basics.phone as string || '';
  // Prefer phoneCountryCode from YAML, fallback to location.countryCode
  const countryCode = basics.phoneCountryCode as string || location.countryCode as string || '';
  const country = location.countryCode as string || location.country as string || '';
  
  // Extract prefix and national number from phone
  // Use the explicit country code if available
  const { prefix, national } = parsePhoneNumber(phone, countryCode || country);
  
  return {
    name: (basics.name as string)?.split(' ')[0] || '',
    surname: (basics.name as string)?.split(' ').slice(1).join(' ') || '',
    dateOfBirth: basics.dateOfBirth as string || '',
    country,
    city: location.city as string || '',
    phone,
    phonePrefix: basics.phonePrefix as string || prefix,
    phoneNational: national,
    email: basics.email as string || '',
    github: extractProfile(basics.profiles, 'github') || basics.github as string || '',
    linkedin: extractProfile(basics.profiles, 'linkedin') || basics.linkedin as string || '',
  };
}

/**
 * Parse a phone number into prefix and national parts
 * 
 * Handles cases:
 * - "+1 555-123-4567" → { prefix: "+1", national: "555-123-4567" }
 * - "+33786948497" → { prefix: "+33", national: "786948497" }
 * - "+33 0786948497" → { prefix: "+33", national: "786948497" } (strips leading 0)
 * - "555-123-4567" with country "US" → { prefix: "+1", national: "555-123-4567" }
 * - "555-123-4567" with no country → { prefix: "", national: "555-123-4567" }
 */
function parsePhoneNumber(phone: string, country: string): { prefix: string; national: string } {
  if (!phone) return { prefix: '', national: '' };
  
  // Known country calling codes sorted by length (longest first) to match correctly
  // E.g., +353 (Ireland) should match before +35, +1 (US/CA) before +1x
  const knownPrefixes = [
    '+971', '+972', '+234',  // 3-digit codes
    '+351', '+353', '+358', '+852',
    '+33', '+44', '+49', '+39', '+34', '+31', '+32', '+41', '+43', '+48',  // 2-digit codes
    '+46', '+47', '+45', '+61', '+64', '+81', '+86', '+91', '+65', '+82',
    '+52', '+55', '+54', '+27',
    '+1',  // 1-digit code (US/CA) - must be last
  ];
  
  // Countries that use a trunk prefix (leading 0) in national format
  const countriesWithTrunkPrefix = [
    '+33', '+44', '+49', '+39', '+34', '+31', '+32', '+41', '+43', '+48',
    '+351', '+353', '+46', '+47', '+45', '+358', '+61', '+64', '+91'
  ];
  
  // Check if phone starts with +
  if (phone.startsWith('+')) {
    // Try to match against known prefixes
    for (const knownPrefix of knownPrefixes) {
      if (phone.startsWith(knownPrefix)) {
        // Extract national number (everything after the prefix)
        let national = phone.slice(knownPrefix.length).trim();
        // Remove any separator characters at the start
        national = national.replace(/^[\s\-.]/, '').trim();
        
        // Strip leading 0 (trunk prefix) for countries that use it
        if (countriesWithTrunkPrefix.includes(knownPrefix) && national.startsWith('0')) {
          national = national.substring(1);
        }
        
        return { prefix: knownPrefix, national };
      }
    }
    
    // Fallback: try regex for unknown prefixes (1-3 digits after +)
    // Use non-greedy match and require separator or known length
    const prefixMatch = phone.match(/^(\+\d{1,3})[\s\-.](.*)$/);
    if (prefixMatch) {
      let national = prefixMatch[2].trim();
      const prefix = prefixMatch[1];
      
      if (countriesWithTrunkPrefix.includes(prefix) && national.startsWith('0')) {
        national = national.substring(1);
      }
      
      return { prefix, national };
    }
  }
  
  // No prefix in phone - try to infer from country
  const inferredPrefix = getPhonePrefixForCountry(country);
  return {
    prefix: inferredPrefix,
    national: phone.trim(),
  };
}

/**
 * Get phone country code prefix from country code or name
 * 
 * Common country codes for job applications
 */
function getPhonePrefixForCountry(country: string): string {
  if (!country) return '';
  
  const countryUpper = country.toUpperCase();
  
  const countryToPrefixMap: Record<string, string> = {
    // North America
    'US': '+1', 'USA': '+1', 'UNITED STATES': '+1',
    'CA': '+1', 'CANADA': '+1',
    
    // Europe
    'GB': '+44', 'UK': '+44', 'UNITED KINGDOM': '+44',
    'DE': '+49', 'GERMANY': '+49',
    'FR': '+33', 'FRANCE': '+33',
    'ES': '+34', 'SPAIN': '+34',
    'IT': '+39', 'ITALY': '+39',
    'NL': '+31', 'NETHERLANDS': '+31',
    'BE': '+32', 'BELGIUM': '+32',
    'CH': '+41', 'SWITZERLAND': '+41',
    'AT': '+43', 'AUSTRIA': '+43',
    'PL': '+48', 'POLAND': '+48',
    'PT': '+351', 'PORTUGAL': '+351',
    'IE': '+353', 'IRELAND': '+353',
    'SE': '+46', 'SWEDEN': '+46',
    'NO': '+47', 'NORWAY': '+47',
    'DK': '+45', 'DENMARK': '+45',
    'FI': '+358', 'FINLAND': '+358',
    
    // Asia Pacific
    'AU': '+61', 'AUSTRALIA': '+61',
    'NZ': '+64', 'NEW ZEALAND': '+64',
    'JP': '+81', 'JAPAN': '+81',
    'CN': '+86', 'CHINA': '+86',
    'IN': '+91', 'INDIA': '+91',
    'SG': '+65', 'SINGAPORE': '+65',
    'HK': '+852', 'HONG KONG': '+852',
    'KR': '+82', 'SOUTH KOREA': '+82', 'KOREA': '+82',
    
    // Middle East
    'AE': '+971', 'UAE': '+971', 'UNITED ARAB EMIRATES': '+971',
    'IL': '+972', 'ISRAEL': '+972',
    
    // Latin America
    'MX': '+52', 'MEXICO': '+52',
    'BR': '+55', 'BRAZIL': '+55',
    'AR': '+54', 'ARGENTINA': '+54',
    
    // Africa
    'ZA': '+27', 'SOUTH AFRICA': '+27',
    'NG': '+234', 'NIGERIA': '+234',
  };
  
  return countryToPrefixMap[countryUpper] || '';
}

function extractPhonePrefix(phone: string | undefined): string {
  if (!phone) return '';
  const match = phone.match(/^\+(\d{1,3})/);
  return match ? `+${match[1]}` : '';
}

function extractProfile(profiles: unknown, network: string): string {
  if (!Array.isArray(profiles)) return '';
  const profile = profiles.find((p: Record<string, unknown>) => 
    (p.network as string)?.toLowerCase() === network
  );
  return profile?.url as string || '';
}

function parseSelfIdentification(data: Record<string, unknown> | undefined): SelfIdentification {
  return {
    gender: data?.gender as string || '',
    pronouns: data?.pronouns as string || 'they/them',
    veteran: data?.veteran as string || 'No',
    disability: data?.disability as string || 'No',
    ethnicity: data?.ethnicity as string || '',
  };
}

function parseLegalAuthorization(data: Record<string, unknown> | undefined): LegalAuthorization {
  return {
    euWorkAuthorization: data?.euWorkAuthorization as string || 'Yes',
    usWorkAuthorization: data?.usWorkAuthorization as string || 'No',
    requiresUsVisa: data?.requiresUsVisa as string || 'Yes',
    legallyAllowedToWorkInUs: data?.legallyAllowedToWorkInUs as string || 'No',
    requiresUsSponsorship: data?.requiresUsSponsorship as string || 'Yes',
    requiresEuVisa: data?.requiresEuVisa as string || 'No',
    legallyAllowedToWorkInEu: data?.legallyAllowedToWorkInEu as string || 'Yes',
    requiresEuSponsorship: data?.requiresEuSponsorship as string || 'No',
  };
}

function parseWorkPreferences(data: Record<string, unknown> | undefined): WorkPreferences {
  return {
    remoteWork: data?.remoteWork as string || 'Yes',
    inPersonWork: data?.inPersonWork as string || 'Yes',
    openToRelocation: data?.openToRelocation as string || 'Yes',
    willingToCompleteAssessments: data?.willingToCompleteAssessments as string || 'Yes',
    willingToUndergoDrugTests: data?.willingToUndergoDrugTests as string || 'Yes',
    willingToUndergoBackgroundChecks: data?.willingToUndergoBackgroundChecks as string || 'Yes',
  };
}

function parseEducation(data: Record<string, unknown>): Education {
  return {
    degree: data.studyType as string || data.degree as string || '',
    university: data.institution as string || data.university as string || '',
    graduationYear: data.endDate as string || data.graduationYear as string || '',
    fieldOfStudy: data.area as string || data.fieldOfStudy as string || '',
    gpa: data.gpa as string,
  };
}

function parseExperience(data: Record<string, unknown>): Experience {
  const startDate = data.startDate as string || '';
  const endDate = data.endDate as string || 'Present';
  
  // Parse highlights into key responsibilities
  const highlights = (data.highlights || []) as string[];
  const keyResponsibilities: Record<string, string> = {};
  highlights.forEach((h, i) => {
    keyResponsibilities[`responsibility_${i + 1}`] = h;
  });

  return {
    position: data.position as string || data.title as string || '',
    company: data.name as string || data.company as string || '',
    employmentPeriod: `${startDate} - ${endDate}`,
    location: data.location as string || '',
    industry: data.industry as string,
    keyResponsibilities,
    skillsAcquired: {},
  };
}

function parseAvailability(data: Record<string, unknown> | undefined): Availability {
  return {
    noticePeriod: data?.noticePeriod as string || '2 weeks',
  };
}

function parseSalaryExpectations(data: Record<string, unknown> | undefined): SalaryExpectations {
  return {
    salaryRangeUSD: data?.salaryRangeUSD as string || '',
  };
}

function parseLanguages(data: Record<string, unknown>[] | undefined): Language[] {
  if (!Array.isArray(data)) return [];
  return data.map(lang => ({
    language: lang.language as string || '',
    proficiency: lang.fluency as string || lang.proficiency as string || '',
  }));
}

function parseSkills(data: unknown): string[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map(s => {
      if (typeof s === 'string') return s;
      if (typeof s === 'object' && s !== null) {
        return (s as Record<string, unknown>).name as string || '';
      }
      return '';
    }).filter(Boolean);
  }
  return [];
}

/**
 * Convert resume to a narrative string for LLM context
 */
export function resumeToNarrative(resume: Resume): string {
  const { personalInformation: pi, experienceDetails, educationDetails, skills } = resume;
  
  let narrative = `${pi.name} ${pi.surname} is a professional`;
  
  if (experienceDetails.length > 0) {
    const recent = experienceDetails[0];
    narrative += ` currently working as ${recent.position} at ${recent.company}`;
  }
  
  if (pi.city && pi.country) {
    narrative += `, based in ${pi.city}, ${pi.country}`;
  }
  
  narrative += '.\n\n';
  
  // Experience
  if (experienceDetails.length > 0) {
    narrative += 'Work Experience:\n';
    for (const exp of experienceDetails) {
      narrative += `- ${exp.position} at ${exp.company} (${exp.employmentPeriod})\n`;
      const responsibilities = Object.values(exp.keyResponsibilities).slice(0, 3);
      for (const r of responsibilities) {
        narrative += `  • ${r}\n`;
      }
    }
    narrative += '\n';
  }
  
  // Education
  if (educationDetails.length > 0) {
    narrative += 'Education:\n';
    for (const edu of educationDetails) {
      narrative += `- ${edu.degree} in ${edu.fieldOfStudy} from ${edu.university} (${edu.graduationYear})\n`;
    }
    narrative += '\n';
  }
  
  // Skills
  if (skills && skills.length > 0) {
    narrative += `Skills: ${skills.join(', ')}\n`;
  }
  
  return narrative;
}

/**
 * Get a specific section of the resume for LLM context
 */
export function getResumeSection(resume: Resume, section: string): string {
  switch (section) {
    case 'personal_information':
      return JSON.stringify(resume.personalInformation, null, 2);
    case 'self_identification':
      return JSON.stringify(resume.selfIdentification, null, 2);
    case 'legal_authorization':
      return JSON.stringify(resume.legalAuthorization, null, 2);
    case 'work_preferences':
      return JSON.stringify(resume.workPreferences, null, 2);
    case 'education_details':
      return JSON.stringify(resume.educationDetails, null, 2);
    case 'experience_details':
      return JSON.stringify(resume.experienceDetails, null, 2);
    case 'availability':
      return JSON.stringify(resume.availability, null, 2);
    case 'salary_expectations':
      return JSON.stringify(resume.salaryExpectations, null, 2);
    case 'languages':
      return JSON.stringify(resume.languages, null, 2);
    case 'interests':
      return resume.interests || '';
    case 'cover_letter':
      return resumeToNarrative(resume);
    default:
      return resumeToNarrative(resume);
  }
}
