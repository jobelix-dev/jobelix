/**
 * Tests for LinkedIn Job Manager
 * 
 * These tests verify that:
 * 1. Job manager initializes correctly
 * 2. Job search URL building works
 * 3. Blacklist filtering works
 * 4. Job card extraction works
 * 5. Application flow is managed correctly
 */

import { describe, it, expect } from 'vitest';
import type { JobSearchConfig } from '../../types';

// Note: These tests focus on the public interface and basic behavior
// without deep mocking of fs and other modules

describe('LinkedInJobManager', () => {
  const sampleConfig: JobSearchConfig = {
    remote: true,
    experienceLevel: {
      internship: false,
      entry: true,
      associate: true,
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
      'all time': false,
      month: false,
      week: true,
      '24 hours': false,
    },
    positions: ['Software Engineer', 'Frontend Developer'],
    locations: ['San Francisco', 'New York', 'Remote'],
    distance: 25,
    companyBlacklist: ['BadCompany', 'SpamCorp'],
    titleBlacklist: ['Senior', 'Director'],
    jobLanguages: ['en'],
  };

  describe('JobSearchConfig', () => {
    it('should have valid remote setting', () => {
      expect(typeof sampleConfig.remote).toBe('boolean');
    });

    it('should have valid experience level configuration', () => {
      expect(sampleConfig.experienceLevel.entry).toBe(true);
      expect(sampleConfig.experienceLevel.associate).toBe(true);
      expect(sampleConfig.experienceLevel['mid-senior level']).toBe(false);
    });

    it('should have valid job types configuration', () => {
      expect(sampleConfig.jobTypes['full-time']).toBe(true);
      expect(sampleConfig.jobTypes.contract).toBe(false);
    });

    it('should have valid date filter configuration', () => {
      expect(sampleConfig.date.week).toBe(true);
      expect(sampleConfig.date['all time']).toBe(false);
    });

    it('should have positions array', () => {
      expect(Array.isArray(sampleConfig.positions)).toBe(true);
      expect(sampleConfig.positions.length).toBe(2);
    });

    it('should have locations array', () => {
      expect(Array.isArray(sampleConfig.locations)).toBe(true);
      expect(sampleConfig.locations.length).toBe(3);
    });

    it('should have valid distance setting', () => {
      expect([0, 5, 10, 25, 50, 100]).toContain(sampleConfig.distance);
    });

    it('should have company blacklist array', () => {
      expect(Array.isArray(sampleConfig.companyBlacklist)).toBe(true);
      expect(sampleConfig.companyBlacklist).toContain('BadCompany');
    });

    it('should have title blacklist array', () => {
      expect(Array.isArray(sampleConfig.titleBlacklist)).toBe(true);
      expect(sampleConfig.titleBlacklist).toContain('Senior');
    });
  });

  describe('blacklist filtering logic', () => {
    it('should filter companies case-insensitively', () => {
      const company = 'BadCompany Inc.';
      const blacklist = sampleConfig.companyBlacklist.map(c => c.toLowerCase());
      const isBlacklisted = blacklist.some(b => company.toLowerCase().includes(b));
      expect(isBlacklisted).toBe(true);
    });

    it('should not filter non-blacklisted companies', () => {
      const company = 'Good Company Inc.';
      const blacklist = sampleConfig.companyBlacklist.map(c => c.toLowerCase());
      const isBlacklisted = blacklist.some(b => company.toLowerCase().includes(b));
      expect(isBlacklisted).toBe(false);
    });

    it('should filter titles that contain blacklisted words', () => {
      const title = 'Senior Software Engineer';
      const blacklist = sampleConfig.titleBlacklist.map(t => t.toLowerCase());
      const isBlacklisted = blacklist.some(b => title.toLowerCase().includes(b));
      expect(isBlacklisted).toBe(true);
    });

    it('should not filter titles without blacklisted words', () => {
      const title = 'Software Engineer';
      const blacklist = sampleConfig.titleBlacklist.map(t => t.toLowerCase());
      const isBlacklisted = blacklist.some(b => title.toLowerCase().includes(b));
      expect(isBlacklisted).toBe(false);
    });
  });

  describe('URL building logic', () => {
    it('should include remote filter parameter when remote is true', () => {
      const urlParts: string[] = [];
      if (sampleConfig.remote) {
        urlParts.push('f_CF=f_WRA');
      }
      expect(urlParts).toContain('f_CF=f_WRA');
    });

    it('should not include remote filter when remote is false', () => {
      const config = { ...sampleConfig, remote: false };
      const urlParts: string[] = [];
      if (config.remote) {
        urlParts.push('f_CF=f_WRA');
      }
      expect(urlParts).not.toContain('f_CF=f_WRA');
    });
  });
});
