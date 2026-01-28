/**
 * Tests for Resume Model
 * 
 * These tests verify that:
 * 1. Resume YAML files are correctly parsed
 * 2. Both new JSON Resume format and legacy format are supported
 * 3. Personal information is extracted correctly
 * 4. Helper functions work as expected
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseResumeYaml, getResumeSection, resumeToNarrative } from '../resume';
import type { Resume } from '../../types';

describe('ResumeModel', () => {
  describe('parseResumeYaml', () => {
    it('should parse basic resume with JSON Resume format', () => {
      const yaml = `
basics:
  name: "John Doe"
  email: "john.doe@example.com"
  phone: "+1 555-123-4567"
  location:
    city: "San Francisco"
    countryCode: "US"
  profiles:
    - network: linkedin
      url: https://linkedin.com/in/johndoe
    - network: github
      url: https://github.com/johndoe
`;
      const resume = parseResumeYaml(yaml);
      
      expect(resume.personalInformation.name).toBe('John');
      expect(resume.personalInformation.surname).toBe('Doe');
      expect(resume.personalInformation.email).toBe('john.doe@example.com');
      expect(resume.personalInformation.phone).toBe('+1 555-123-4567');
      expect(resume.personalInformation.city).toBe('San Francisco');
      expect(resume.personalInformation.country).toBe('US');
    });

    it('should parse resume with legacy format', () => {
      const yaml = `
personal_information:
  name: "Jane Smith"
  email: "jane@example.com"
  phone: "+44 20 1234 5678"
  city: "London"
  country: "UK"
`;
      const resume = parseResumeYaml(yaml);
      
      expect(resume.personalInformation.name).toBe('Jane');
      expect(resume.personalInformation.surname).toBe('Smith');
      expect(resume.personalInformation.email).toBe('jane@example.com');
    });

    it('should extract phone prefix from phone number', () => {
      const yaml = `
basics:
  name: "Test User"
  phone: "+33 6 12 34 56 78"
`;
      const resume = parseResumeYaml(yaml);
      
      expect(resume.personalInformation.phonePrefix).toBe('+33');
    });

    it('should handle missing phone prefix gracefully', () => {
      const yaml = `
basics:
  name: "Test User"
  phone: "555-123-4567"
`;
      const resume = parseResumeYaml(yaml);
      
      expect(resume.personalInformation.phonePrefix).toBe('');
    });

    it('should parse work experience', () => {
      const yaml = `
basics:
  name: "Developer User"
work:
  - name: "Tech Company"
    position: "Software Engineer"
    startDate: "2020-01-01"
    endDate: "2023-06-30"
    summary: "Built awesome stuff"
  - name: "Startup Inc"
    position: "Junior Developer"
    startDate: "2018-06-01"
    endDate: "2019-12-31"
`;
      const resume = parseResumeYaml(yaml);
      
      expect(resume.experienceDetails).toHaveLength(2);
      expect(resume.experienceDetails[0].company).toBe('Tech Company');
      expect(resume.experienceDetails[0].position).toBe('Software Engineer');
    });

    it('should parse education details', () => {
      const yaml = `
basics:
  name: "Student User"
education:
  - institution: "MIT"
    studyType: "Bachelor"
    area: "Computer Science"
    startDate: "2014-09-01"
    endDate: "2018-05-31"
`;
      const resume = parseResumeYaml(yaml);
      
      expect(resume.educationDetails).toHaveLength(1);
      expect(resume.educationDetails[0].university).toBe('MIT');
      expect(resume.educationDetails[0].degree).toBe('Bachelor');
      expect(resume.educationDetails[0].fieldOfStudy).toBe('Computer Science');
    });

    it('should parse self identification data', () => {
      const yaml = `
basics:
  name: "User Name"
self_identification:
  gender: "Male"
  pronouns: "He/Him"
  veteran: "No"
  disability: "No"
  ethnicity: "Prefer not to say"
`;
      const resume = parseResumeYaml(yaml);
      
      expect(resume.selfIdentification?.gender).toBe('Male');
      expect(resume.selfIdentification?.pronouns).toBe('He/Him');
      expect(resume.selfIdentification?.veteran).toBe('No');
    });

    it('should parse legal authorization data', () => {
      const yaml = `
basics:
  name: "User Name"
legal_authorization:
  euWorkAuthorization: "Yes"
  usWorkAuthorization: "No"
  requiresUsVisa: "No"
  legallyAllowedToWorkInUs: "No"
  requiresUsSponsorship: "No"
`;
      const resume = parseResumeYaml(yaml);
      
      expect(resume.legalAuthorization?.euWorkAuthorization).toBe('Yes');
      expect(resume.legalAuthorization?.usWorkAuthorization).toBe('No');
    });

    it('should parse work preferences', () => {
      const yaml = `
basics:
  name: "User Name"
work_preferences:
  remoteWork: "Yes"
  inPersonWork: "No"
  openToRelocation: "Yes"
  willingToCompleteAssessments: "Yes"
  willingToUndergoDrugTests: "No"
  willingToUndergoBackgroundChecks: "Yes"
`;
      const resume = parseResumeYaml(yaml);
      
      expect(resume.workPreferences?.remoteWork).toBe('Yes');
      expect(resume.workPreferences?.inPersonWork).toBe('No');
      expect(resume.workPreferences?.openToRelocation).toBe('Yes');
    });

    it('should parse availability data', () => {
      const yaml = `
basics:
  name: "User Name"
availability:
  noticePeriod: "2 weeks"
`;
      const resume = parseResumeYaml(yaml);
      
      expect(resume.availability?.noticePeriod).toBe('2 weeks');
    });

    it('should parse salary expectations', () => {
      const yaml = `
basics:
  name: "User Name"
salary_expectations:
  salaryRangeUSD: "$100,000 - $150,000"
`;
      const resume = parseResumeYaml(yaml);
      
      expect(resume.salaryExpectations?.salaryRangeUSD).toBe('$100,000 - $150,000');
    });

    it('should parse languages', () => {
      const yaml = `
basics:
  name: "User Name"
languages:
  - language: "English"
    proficiency: "Native"
  - language: "Spanish"
    proficiency: "Conversational"
`;
      const resume = parseResumeYaml(yaml);
      
      expect(resume.languages).toHaveLength(2);
      expect(resume.languages![0].language).toBe('English');
      expect(resume.languages![0].proficiency).toBe('Native');
    });

    it('should parse skills', () => {
      const yaml = `
basics:
  name: "User Name"
skills:
  - name: Programming
    keywords:
      - JavaScript
      - TypeScript
      - Python
  - name: Tools
    keywords:
      - Git
      - Docker
`;
      const resume = parseResumeYaml(yaml);
      
      expect(resume.skills).toBeDefined();
      // Skills should be flattened or structured appropriately
    });

    it('should handle empty/minimal resume', () => {
      const yaml = `
basics:
  name: "Minimal User"
`;
      const resume = parseResumeYaml(yaml);
      
      expect(resume.personalInformation.name).toBe('Minimal');
      expect(resume.personalInformation.surname).toBe('User');
      expect(resume.educationDetails).toHaveLength(0);
      expect(resume.experienceDetails).toHaveLength(0);
    });
  });

  describe('getResumeSection', () => {
    let resume: Resume;

    beforeEach(() => {
      resume = parseResumeYaml(`
basics:
  name: "Test User"
  email: "test@example.com"
  phone: "+1 555-1234"
  location:
    city: "New York"
    countryCode: "US"
work:
  - name: "Company A"
    position: "Engineer"
    startDate: "2020-01"
    summary: "Did engineering things"
education:
  - institution: "University"
    studyType: "Masters"
    area: "Computer Science"
`);
    });

    it('should return personal information section', () => {
      const section = getResumeSection(resume, 'personal');
      
      expect(section).toContain('Test User');
      // The section may format data differently
    });

    it('should return work experience section', () => {
      const section = getResumeSection(resume, 'work');
      
      expect(section).toContain('Company A');
    });

    it('should return education section', () => {
      const section = getResumeSection(resume, 'education');
      
      expect(section).toContain('University');
    });

    it('should return something for unknown sections', () => {
      // Unknown sections may return a default or the full resume
      const section = getResumeSection(resume, 'unknown' as any);
      
      // Just verify it doesn't throw and returns a string
      expect(typeof section).toBe('string');
    });
  });

  describe('resumeToNarrative', () => {
    it('should convert resume to narrative text', () => {
      const resume = parseResumeYaml(`
basics:
  name: "John Developer"
  email: "john@example.com"
work:
  - name: "Tech Corp"
    position: "Senior Developer"
    startDate: "2020-01"
    summary: "Led development team"
education:
  - institution: "State University"
    studyType: "Bachelor"
    area: "Software Engineering"
`);
      const narrative = resumeToNarrative(resume);
      
      expect(narrative).toContain('John');
      expect(narrative).toContain('Developer');
      expect(narrative.length).toBeGreaterThan(50);
    });

    it('should include work history in narrative', () => {
      const resume = parseResumeYaml(`
basics:
  name: "Jane Coder"
work:
  - name: "Startup Inc"
    position: "Full Stack Developer"
    summary: "Built the entire platform"
`);
      const narrative = resumeToNarrative(resume);
      
      expect(narrative).toContain('Startup Inc');
    });
  });
});
