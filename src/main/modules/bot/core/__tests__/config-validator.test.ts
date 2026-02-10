/**
 * Tests for Configuration Validator
 * 
 * These tests verify that:
 * 1. Valid YAML configurations are properly parsed
 * 2. Invalid configurations throw appropriate errors
 * 3. All required fields are validated
 * 4. Search URL building works correctly
 */

import { describe, it, expect } from 'vitest';
import { validateConfig, ConfigError, buildSearchUrl } from '../config-validator';
import type { JobSearchConfig } from '../../types';

describe('ConfigValidator', () => {
  // Base valid configuration for testing
  // All fields are set to valid values
  const validConfig: Record<string, unknown> = {
    remote: true,
    experienceLevel: {
      internship: true,
      entry: true,
      associate: false,
      'mid-senior level': true,
      director: false,
      executive: false,
    },
    jobTypes: {
      'full-time': true,
      contract: false,
      'part-time': false,
      temporary: false,
      internship: false,
      other: false,
      volunteer: false,
    },
    date: {
      'all time': false,
      month: false,
      week: true,
      '24 hours': false,
    },
    positions: ['Software Engineer', 'Developer'],
    locations: ['San Francisco', 'Remote'],
    distance: 25,
    companyBlacklist: ['BadCompany'],
    titleBlacklist: ['Senior'],
  };

  describe('validateConfig', () => {
    it('should validate a complete valid configuration', () => {
      const result = validateConfig(validConfig);
      
      expect(result.remote).toBe(true);
      expect(result.positions).toEqual(['Software Engineer', 'Developer']);
      expect(result.locations).toEqual(['San Francisco', 'Remote']);
      expect(result.distance).toBe(25);
    });

    it('should throw ConfigError when remote is not boolean', () => {
      const invalidConfig = { ...validConfig, remote: 'yes' };
      
      expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
      expect(() => validateConfig(invalidConfig)).toThrow("'remote' must be a boolean value");
    });

    it('should throw ConfigError when remote is missing', () => {
      const { remote: _remote, ...configWithoutRemote } = validConfig;
      
      expect(() => validateConfig(configWithoutRemote)).toThrow(ConfigError);
    });
  });

  describe('experienceLevel validation', () => {
    it('should validate all experience levels', () => {
      const result = validateConfig(validConfig);
      
      expect(result.experienceLevel.internship).toBe(true);
      expect(result.experienceLevel.entry).toBe(true);
      expect(result.experienceLevel.associate).toBe(false);
      expect(result.experienceLevel['mid-senior level']).toBe(true);
      expect(result.experienceLevel.director).toBe(false);
      expect(result.experienceLevel.executive).toBe(false);
    });

    it('should throw ConfigError for invalid experience level value', () => {
      const invalidConfig = {
        ...validConfig,
        experienceLevel: {
          ...validConfig.experienceLevel as Record<string, unknown>,
          internship: 'yes', // Should be boolean
        },
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
      expect(() => validateConfig(invalidConfig)).toThrow("must be a boolean value");
    });

    it('should throw ConfigError for missing experience level', () => {
      const invalidConfig = {
        ...validConfig,
        experienceLevel: {
          internship: true,
          entry: true,
          // Missing other levels
        },
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
    });
  });

  describe('jobTypes validation', () => {
    it('should validate all job types', () => {
      const result = validateConfig(validConfig);
      
      expect(result.jobTypes['full-time']).toBe(true);
      expect(result.jobTypes.contract).toBe(false);
      expect(result.jobTypes['part-time']).toBe(false);
      expect(result.jobTypes.temporary).toBe(false);
      expect(result.jobTypes.internship).toBe(false);
      expect(result.jobTypes.other).toBe(false);
      expect(result.jobTypes.volunteer).toBe(false);
    });

    it('should throw ConfigError for invalid job type value', () => {
      const invalidConfig = {
        ...validConfig,
        jobTypes: {
          ...(validConfig.jobTypes as Record<string, unknown>),
          'full-time': 'yes', // Should be boolean
        },
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
    });
  });

  describe('date filter validation', () => {
    it('should validate all date filters', () => {
      const result = validateConfig(validConfig);
      
      expect(result.date['all time']).toBe(false);
      expect(result.date.month).toBe(false);
      expect(result.date.week).toBe(true);
      expect(result.date['24 hours']).toBe(false);
    });

    it('should throw ConfigError for invalid date filter value', () => {
      const invalidConfig = {
        ...validConfig,
        date: {
          ...(validConfig.date as Record<string, unknown>),
          week: 'yes', // Should be boolean
        },
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
    });
  });

  describe('positions validation', () => {
    it('should accept valid string array', () => {
      const result = validateConfig(validConfig);
      
      expect(result.positions).toHaveLength(2);
      expect(result.positions[0]).toBe('Software Engineer');
    });

    it('should throw ConfigError when positions is not an array', () => {
      const invalidConfig = {
        ...validConfig,
        positions: 'Software Engineer', // Should be array
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
      expect(() => validateConfig(invalidConfig)).toThrow("'positions' must be an array");
    });

    it('should throw ConfigError when positions contains non-strings', () => {
      const invalidConfig = {
        ...validConfig,
        positions: ['Software Engineer', 123], // Contains number
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
      expect(() => validateConfig(invalidConfig)).toThrow("must contain only strings");
    });
  });

  describe('locations validation', () => {
    it('should accept valid string array', () => {
      const result = validateConfig(validConfig);
      
      expect(result.locations).toHaveLength(2);
      expect(result.locations[0]).toBe('San Francisco');
    });

    it('should throw ConfigError when locations is not an array', () => {
      const invalidConfig = {
        ...validConfig,
        locations: 'San Francisco', // Should be array
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
    });
  });

  describe('distance validation', () => {
    it('should accept valid distance values', () => {
      const validDistances = [0, 5, 10, 25, 50, 100];
      
      for (const distance of validDistances) {
        const config = { ...validConfig, distance };
        const result = validateConfig(config);
        expect(result.distance).toBe(distance);
      }
    });

    it('should throw ConfigError for invalid distance value', () => {
      const invalidConfig = {
        ...validConfig,
        distance: 30, // Not in valid set
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
      expect(() => validateConfig(invalidConfig)).toThrow('Invalid distance value');
    });

    it('should throw ConfigError when distance is not a number', () => {
      const invalidConfig = {
        ...validConfig,
        distance: '25', // Should be number
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow(ConfigError);
    });
  });

  describe('blacklist sanitization', () => {
    it('should accept valid company blacklist', () => {
      const result = validateConfig(validConfig);
      
      expect(result.companyBlacklist).toEqual(['BadCompany']);
    });

    it('should accept valid title blacklist', () => {
      const result = validateConfig(validConfig);
      
      expect(result.titleBlacklist).toEqual(['Senior']);
    });

    it('should return empty array when blacklist is not an array', () => {
      const configWithInvalidBlacklist = {
        ...validConfig,
        companyBlacklist: 'BadCompany', // Should be array
      };
      
      const result = validateConfig(configWithInvalidBlacklist);
      expect(result.companyBlacklist).toEqual([]);
    });

    it('should filter out non-string values from blacklists', () => {
      const configWithMixedBlacklist = {
        ...validConfig,
        companyBlacklist: ['BadCompany', 123, null, 'AnotherBad'],
      };
      
      const result = validateConfig(configWithMixedBlacklist);
      expect(result.companyBlacklist).toEqual(['BadCompany', 'AnotherBad']);
    });
  });
});

describe('buildSearchUrl', () => {
  it('should include remote filter when enabled', () => {
    const config: JobSearchConfig = {
      remote: true,
      experienceLevel: {
        internship: false,
        entry: true,
        associate: false,
        'mid-senior level': false,
        director: false,
        executive: false,
      },
      jobTypes: {
        'full-time': true,
        contract: false,
        'part-time': false,
        temporary: false,
        internship: false,
        other: false,
        volunteer: false,
      },
      date: {
        'all time': true,
        month: false,
        week: false,
        '24 hours': false,
      },
      positions: ['Developer'],
      locations: ['NYC'],
      distance: 25,
      companyBlacklist: [],
      titleBlacklist: [],
      jobLanguages: ['en'],
    };

    const url = buildSearchUrl(config);
    expect(url).toContain('f_CF=f_WRA');
  });

  it('should not include remote filter when disabled', () => {
    const config: JobSearchConfig = {
      remote: false,
      experienceLevel: {
        internship: false,
        entry: true,
        associate: false,
        'mid-senior level': false,
        director: false,
        executive: false,
      },
      jobTypes: {
        'full-time': true,
        contract: false,
        'part-time': false,
        temporary: false,
        internship: false,
        other: false,
        volunteer: false,
      },
      date: {
        'all time': true,
        month: false,
        week: false,
        '24 hours': false,
      },
      positions: ['Developer'],
      locations: ['NYC'],
      distance: 25,
      companyBlacklist: [],
      titleBlacklist: [],
      jobLanguages: ['en'],
    };

    const url = buildSearchUrl(config);
    expect(url).not.toContain('f_CF=f_WRA');
  });
});
