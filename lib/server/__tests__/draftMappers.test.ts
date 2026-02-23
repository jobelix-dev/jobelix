/**
 * Tests for lib/server/draftMappers.ts
 * 
 * Tests all mapper functions that convert draft data to database records:
 * - mapDraftToStudent (includes parseName + normalizePhoneToE164)
 * - mapDraftToAcademic
 * - mapDraftToExperience
 * - mapDraftToProjects
 * - mapDraftToSkills
 * - mapDraftToLanguages
 * - mapDraftToPublications
 * - mapDraftToCertifications
 * - mapDraftToSocialLinks
 */

import { describe, it, expect } from 'vitest';
import {
  mapDraftToStudent,
  mapDraftToAcademic,
  mapDraftToExperience,
  mapDraftToProjects,
  mapDraftToSkills,
  mapDraftToLanguages,
  mapDraftToPublications,
  mapDraftToCertifications,
  mapDraftToSocialLinks,
} from '../draftMappers';

const TEST_USER_ID = 'user-123-abc';

// ============================================================================
// mapDraftToStudent
// ============================================================================

describe('mapDraftToStudent', () => {
  it('should map basic draft data to student record', () => {
    const result = mapDraftToStudent({
      student_name: 'John Doe',
      phone_number: '+33612345678',
      phone_country_code: 'FR',
      email: 'john@example.com',
      address: 'Paris, France',
    }, TEST_USER_ID);

    expect(result.id).toBe(TEST_USER_ID);
    expect(result.student_name).toBe('John Doe');
    expect(result.first_name).toBe('John');
    expect(result.last_name).toBe('Doe');
    expect(result.mail_adress).toBe('john@example.com');
    expect(result.address).toBe('Paris, France');
  });

  it('should parse single-word name correctly', () => {
    const result = mapDraftToStudent({
      student_name: 'Madonna',
      phone_number: '+33612345678',
    }, TEST_USER_ID);

    expect(result.first_name).toBe('Madonna');
    expect(result.last_name).toBeNull();
  });

  it('should parse multi-word last name correctly', () => {
    const result = mapDraftToStudent({
      student_name: 'Jean Pierre de la Cruz',
      phone_number: '+33612345678',
    }, TEST_USER_ID);

    expect(result.first_name).toBe('Jean');
    expect(result.last_name).toBe('Pierre de la Cruz');
  });

  it('should handle null student_name', () => {
    const result = mapDraftToStudent({
      student_name: null,
      phone_number: '+33612345678',
    }, TEST_USER_ID);

    expect(result.student_name).toBeNull();
    expect(result.first_name).toBeNull();
    expect(result.last_name).toBeNull();
  });

  it('should handle empty string student_name', () => {
    const result = mapDraftToStudent({
      student_name: '   ',
      phone_number: '+33612345678',
    }, TEST_USER_ID);

    expect(result.first_name).toBeNull();
    expect(result.last_name).toBeNull();
  });

  it('should handle null email', () => {
    const result = mapDraftToStudent({
      phone_number: '+33612345678',
      email: null,
    }, TEST_USER_ID);

    expect(result.mail_adress).toBeNull();
  });

  it('should handle missing email (defaults to null)', () => {
    const result = mapDraftToStudent({
      phone_number: '+33612345678',
    }, TEST_USER_ID);

    expect(result.mail_adress).toBeNull();
  });

  it('should handle null phone number', () => {
    const result = mapDraftToStudent({
      phone_number: null,
    }, TEST_USER_ID);

    // normalizePhoneToE164 returns null e164 for empty input
    expect(result.phone_number).toBeNull();
  });

  it('should default phone country code to FR when not provided', () => {
    const result = mapDraftToStudent({
      phone_number: null,
    }, TEST_USER_ID);

    expect(result.phone_country_code).toBe('FR');
  });

  it('should normalize phone number to E.164 format', () => {
    const result = mapDraftToStudent({
      phone_number: '06 12 34 56 78',
      phone_country_code: 'FR',
    }, TEST_USER_ID);

    // Should be normalized to E.164
    expect(result.phone_number).toBe('+33612345678');
  });

  it('should handle name with extra whitespace', () => {
    const result = mapDraftToStudent({
      student_name: '  John   Doe  ',
      phone_number: '+33612345678',
    }, TEST_USER_ID);

    expect(result.first_name).toBe('John');
    expect(result.last_name).toBe('Doe');
  });
});

// ============================================================================
// mapDraftToAcademic
// ============================================================================

describe('mapDraftToAcademic', () => {
  it('should map valid education entries', () => {
    const result = mapDraftToAcademic({
      education: [{
        school_name: 'MIT',
        degree: 'BS Computer Science',
        description: 'Honors student',
        start_year: 2018,
        start_month: 9,
        end_year: 2022,
        end_month: 6,
      }],
    }, TEST_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].student_id).toBe(TEST_USER_ID);
    expect(result[0].school_name).toBe('MIT');
    expect(result[0].degree).toBe('BS Computer Science');
    expect(result[0].description).toBe('Honors student');
    expect(result[0].start_year).toBe(2018);
    expect(result[0].start_month).toBe(9);
    expect(result[0].end_year).toBe(2022);
    expect(result[0].end_month).toBe(6);
  });

  it('should return empty array for undefined education', () => {
    const result = mapDraftToAcademic({}, TEST_USER_ID);
    expect(result).toEqual([]);
  });

  it('should return empty array for empty education array', () => {
    const result = mapDraftToAcademic({ education: [] }, TEST_USER_ID);
    expect(result).toEqual([]);
  });

  it('should filter out entries missing school_name', () => {
    const result = mapDraftToAcademic({
      education: [{
        degree: 'BS',
        start_year: 2020,
        start_month: 9,
      }],
    }, TEST_USER_ID);

    expect(result).toEqual([]);
  });

  it('should filter out entries missing degree', () => {
    const result = mapDraftToAcademic({
      education: [{
        school_name: 'MIT',
        start_year: 2020,
        start_month: 9,
      }],
    }, TEST_USER_ID);

    expect(result).toEqual([]);
  });

  it('should filter out entries missing start_year', () => {
    const result = mapDraftToAcademic({
      education: [{
        school_name: 'MIT',
        degree: 'BS',
        start_month: 9,
      }],
    }, TEST_USER_ID);

    expect(result).toEqual([]);
  });

  it('should filter out entries missing start_month', () => {
    const result = mapDraftToAcademic({
      education: [{
        school_name: 'MIT',
        degree: 'BS',
        start_year: 2020,
      }],
    }, TEST_USER_ID);

    expect(result).toEqual([]);
  });

  it('should handle null end dates', () => {
    const result = mapDraftToAcademic({
      education: [{
        school_name: 'MIT',
        degree: 'BS',
        start_year: 2020,
        start_month: 9,
        end_year: null,
        end_month: null,
      }],
    }, TEST_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].end_year).toBeNull();
    expect(result[0].end_month).toBeNull();
  });

  it('should handle null description', () => {
    const result = mapDraftToAcademic({
      education: [{
        school_name: 'MIT',
        degree: 'BS',
        start_year: 2020,
        start_month: 9,
        description: null,
      }],
    }, TEST_USER_ID);

    expect(result[0].description).toBeNull();
  });

  it('should map multiple valid entries and filter invalid ones', () => {
    const result = mapDraftToAcademic({
      education: [
        { school_name: 'MIT', degree: 'BS', start_year: 2018, start_month: 9 },
        { school_name: 'Stanford', degree: 'MS' }, // missing start_year/month
        { school_name: 'Harvard', degree: 'PhD', start_year: 2022, start_month: 1 },
      ],
    }, TEST_USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].school_name).toBe('MIT');
    expect(result[1].school_name).toBe('Harvard');
  });
});

// ============================================================================
// mapDraftToExperience
// ============================================================================

describe('mapDraftToExperience', () => {
  it('should map valid experience entries', () => {
    const result = mapDraftToExperience({
      experience: [{
        organisation_name: 'Google',
        position_name: 'Software Engineer',
        description: 'Worked on search',
        start_year: 2022,
        start_month: 7,
        end_year: 2024,
        end_month: 1,
      }],
    }, TEST_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].student_id).toBe(TEST_USER_ID);
    expect(result[0].organisation_name).toBe('Google');
    expect(result[0].position_name).toBe('Software Engineer');
    expect(result[0].start_year).toBe(2022);
    expect(result[0].start_month).toBe(7);
  });

  it('should return empty array for undefined experience', () => {
    const result = mapDraftToExperience({}, TEST_USER_ID);
    expect(result).toEqual([]);
  });

  it('should return empty array for empty experience array', () => {
    const result = mapDraftToExperience({ experience: [] }, TEST_USER_ID);
    expect(result).toEqual([]);
  });

  it('should filter out entries missing organisation_name', () => {
    const result = mapDraftToExperience({
      experience: [{
        position_name: 'Engineer',
        start_year: 2020,
        start_month: 1,
      }],
    }, TEST_USER_ID);

    expect(result).toEqual([]);
  });

  it('should filter out entries missing position_name', () => {
    const result = mapDraftToExperience({
      experience: [{
        organisation_name: 'Google',
        start_year: 2020,
        start_month: 1,
      }],
    }, TEST_USER_ID);

    expect(result).toEqual([]);
  });

  it('should handle null end dates (current job)', () => {
    const result = mapDraftToExperience({
      experience: [{
        organisation_name: 'Google',
        position_name: 'Engineer',
        start_year: 2022,
        start_month: 7,
        end_year: null,
        end_month: null,
      }],
    }, TEST_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].end_year).toBeNull();
    expect(result[0].end_month).toBeNull();
  });
});

// ============================================================================
// mapDraftToProjects
// ============================================================================

describe('mapDraftToProjects', () => {
  it('should map valid project entries', () => {
    const result = mapDraftToProjects({
      projects: [{
        project_name: 'Open Source Lib',
        description: 'A useful library',
        link: 'https://github.com/example',
      }],
    }, TEST_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].student_id).toBe(TEST_USER_ID);
    expect(result[0].project_name).toBe('Open Source Lib');
    expect(result[0].description).toBe('A useful library');
    expect(result[0].link).toBe('https://github.com/example');
  });

  it('should return empty array for undefined projects', () => {
    const result = mapDraftToProjects({}, TEST_USER_ID);
    expect(result).toEqual([]);
  });

  it('should return empty array for empty projects array', () => {
    const result = mapDraftToProjects({ projects: [] }, TEST_USER_ID);
    expect(result).toEqual([]);
  });

  it('should filter out entries with empty project_name', () => {
    const result = mapDraftToProjects({
      projects: [
        { project_name: 'Valid Project', description: 'desc' },
        { project_name: '', description: 'no name' },
        { project_name: '  ', description: 'whitespace name' },
      ],
    }, TEST_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].project_name).toBe('Valid Project');
  });

  it('should handle null description and link', () => {
    const result = mapDraftToProjects({
      projects: [{
        project_name: 'Project',
        description: null,
        link: null,
      }],
    }, TEST_USER_ID);

    expect(result[0].description).toBeNull();
    expect(result[0].link).toBeNull();
  });
});

// ============================================================================
// mapDraftToSkills
// ============================================================================

describe('mapDraftToSkills', () => {
  it('should map valid skill entries', () => {
    const result = mapDraftToSkills({
      skills: [
        { skill_name: 'TypeScript', skill_slug: 'typescript' },
        { skill_name: 'React', skill_slug: 'react' },
      ],
    }, TEST_USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].student_id).toBe(TEST_USER_ID);
    expect(result[0].skill_name).toBe('TypeScript');
    expect(result[0].skill_slug).toBe('typescript');
  });

  it('should return empty array for undefined skills', () => {
    const result = mapDraftToSkills({}, TEST_USER_ID);
    expect(result).toEqual([]);
  });

  it('should filter out entries with empty skill_name', () => {
    const result = mapDraftToSkills({
      skills: [
        { skill_name: 'TypeScript', skill_slug: 'ts' },
        { skill_name: '', skill_slug: 'empty' },
        { skill_name: '  ', skill_slug: 'whitespace' },
      ],
    }, TEST_USER_ID);

    expect(result).toHaveLength(1);
  });
});

// ============================================================================
// mapDraftToLanguages
// ============================================================================

describe('mapDraftToLanguages', () => {
  it('should map valid language entries', () => {
    const result = mapDraftToLanguages({
      languages: [
        { language_name: 'English', proficiency_level: 'Native' },
        { language_name: 'French', proficiency_level: 'Fluent' },
      ],
    }, TEST_USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].student_id).toBe(TEST_USER_ID);
    expect(result[0].language_name).toBe('English');
    expect(result[0].proficiency_level).toBe('Native');
  });

  it('should return empty array for undefined languages', () => {
    const result = mapDraftToLanguages({}, TEST_USER_ID);
    expect(result).toEqual([]);
  });

  it('should filter out entries with empty language_name', () => {
    const result = mapDraftToLanguages({
      languages: [
        { language_name: 'English' },
        { language_name: '' },
      ],
    }, TEST_USER_ID);

    expect(result).toHaveLength(1);
  });
});

// ============================================================================
// mapDraftToPublications
// ============================================================================

describe('mapDraftToPublications', () => {
  it('should map valid publication entries', () => {
    const result = mapDraftToPublications({
      publications: [{
        title: 'ML Paper',
        journal_name: 'Nature',
        description: 'Research paper',
        publication_year: 2023,
        publication_month: 3,
        link: 'https://doi.org/example',
      }],
    }, TEST_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].student_id).toBe(TEST_USER_ID);
    expect(result[0].title).toBe('ML Paper');
    expect(result[0].journal_name).toBe('Nature');
  });

  it('should return empty array for undefined publications', () => {
    const result = mapDraftToPublications({}, TEST_USER_ID);
    expect(result).toEqual([]);
  });

  it('should filter out entries with empty title', () => {
    const result = mapDraftToPublications({
      publications: [
        { title: 'Valid Paper' },
        { title: '' },
        { title: '  ' },
      ],
    }, TEST_USER_ID);

    expect(result).toHaveLength(1);
  });

  it('should handle null optional fields', () => {
    const result = mapDraftToPublications({
      publications: [{
        title: 'Paper',
        journal_name: null,
        description: null,
        publication_year: null,
        publication_month: null,
        link: null,
      }],
    }, TEST_USER_ID);

    expect(result[0].journal_name).toBeNull();
    expect(result[0].description).toBeNull();
    expect(result[0].publication_year).toBeNull();
    expect(result[0].publication_month).toBeNull();
    expect(result[0].link).toBeNull();
  });
});

// ============================================================================
// mapDraftToCertifications
// ============================================================================

describe('mapDraftToCertifications', () => {
  it('should map valid certification entries', () => {
    const result = mapDraftToCertifications({
      certifications: [{
        name: 'AWS Certified',
        issuing_organization: 'Amazon',
        url: 'https://aws.amazon.com/cert/123',
      }],
    }, TEST_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].student_id).toBe(TEST_USER_ID);
    expect(result[0].name).toBe('AWS Certified');
    expect(result[0].issuing_organization).toBe('Amazon');
    expect(result[0].url).toBe('https://aws.amazon.com/cert/123');
  });

  it('should return empty array for undefined certifications', () => {
    const result = mapDraftToCertifications({}, TEST_USER_ID);
    expect(result).toEqual([]);
  });

  it('should filter out entries with empty name', () => {
    const result = mapDraftToCertifications({
      certifications: [
        { name: 'AWS Certified' },
        { name: '' },
        { name: '  ' },
      ],
    }, TEST_USER_ID);

    expect(result).toHaveLength(1);
  });

  it('should handle null optional fields', () => {
    const result = mapDraftToCertifications({
      certifications: [{
        name: 'Cert',
        issuing_organization: null,
        url: null,
      }],
    }, TEST_USER_ID);

    expect(result[0].issuing_organization).toBeNull();
    expect(result[0].url).toBeNull();
  });
});

// ============================================================================
// mapDraftToSocialLinks
// ============================================================================

describe('mapDraftToSocialLinks', () => {
  it('should map valid social links', () => {
    const result = mapDraftToSocialLinks({
      social_links: {
        github: 'https://github.com/johndoe',
        linkedin: 'https://linkedin.com/in/johndoe',
        stackoverflow: null,
        kaggle: null,
        leetcode: null,
      },
    }, TEST_USER_ID);

    expect(result).not.toBeNull();
    expect(result!.student_id).toBe(TEST_USER_ID);
    expect(result!.github).toBe('https://github.com/johndoe');
    expect(result!.linkedin).toBe('https://linkedin.com/in/johndoe');
    expect(result!.stackoverflow).toBeNull();
    expect(result!.kaggle).toBeNull();
    expect(result!.leetcode).toBeNull();
  });

  it('should return null for undefined social_links', () => {
    const result = mapDraftToSocialLinks({}, TEST_USER_ID);
    expect(result).toBeNull();
  });

  it('should return null for null social_links', () => {
    const result = mapDraftToSocialLinks({ social_links: null }, TEST_USER_ID);
    expect(result).toBeNull();
  });

  it('should return null when all platforms are empty', () => {
    const result = mapDraftToSocialLinks({
      social_links: {
        github: null,
        linkedin: null,
        stackoverflow: null,
        kaggle: null,
        leetcode: null,
      },
    }, TEST_USER_ID);

    expect(result).toBeNull();
  });

  it('should return null when all platforms are empty strings', () => {
    const result = mapDraftToSocialLinks({
      social_links: {
        github: '',
        linkedin: '',
      },
    }, TEST_USER_ID);

    // Empty strings are falsy, so this should return null
    expect(result).toBeNull();
  });

  it('should trim URLs', () => {
    const result = mapDraftToSocialLinks({
      social_links: {
        github: '  https://github.com/johndoe  ',
      },
    }, TEST_USER_ID);

    expect(result).not.toBeNull();
    expect(result!.github).toBe('https://github.com/johndoe');
  });

  it('should map all five platforms', () => {
    const result = mapDraftToSocialLinks({
      social_links: {
        github: 'https://github.com/user',
        linkedin: 'https://linkedin.com/in/user',
        stackoverflow: 'https://stackoverflow.com/users/123',
        kaggle: 'https://kaggle.com/user',
        leetcode: 'https://leetcode.com/user',
      },
    }, TEST_USER_ID);

    expect(result).not.toBeNull();
    expect(result!.github).toBe('https://github.com/user');
    expect(result!.linkedin).toBe('https://linkedin.com/in/user');
    expect(result!.stackoverflow).toBe('https://stackoverflow.com/users/123');
    expect(result!.kaggle).toBe('https://kaggle.com/user');
    expect(result!.leetcode).toBe('https://leetcode.com/user');
  });
});
