/**
 * Tests for GPT Answerer
 * 
 * These tests verify that:
 * 1. GPTAnswerer initializes correctly
 * 2. Resume and job context are properly set
 * 3. Different question types are answered correctly
 * 4. API errors are handled gracefully
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GPTAnswerer } from '../gpt-answerer';
import type { Resume, Job } from '../../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GPTAnswerer', () => {
  const mockApiToken = 'test-api-token';
  const mockApiUrl = 'https://api.example.com/chat';
  let gptAnswerer: GPTAnswerer;

  // Sample resume for testing (matches actual types)
  const mockResume: Resume = {
    personalInformation: {
      name: 'John',
      surname: 'Doe',
      dateOfBirth: '1990-01-15',
      country: 'US',
      city: 'San Francisco',
      phone: '+1 555-123-4567',
      phonePrefix: '+1',
      phoneNational: '555-123-4567',
      email: 'john.doe@example.com',
      github: 'https://github.com/johndoe',
      linkedin: 'https://linkedin.com/in/johndoe',
    },
    selfIdentification: {
      gender: 'Male',
      pronouns: 'He/Him',
      veteran: 'No',
      disability: 'No',
      ethnicity: 'Prefer not to say',
    },
    legalAuthorization: {
      euWorkAuthorization: 'No',
      usWorkAuthorization: 'Yes',
      requiresUsVisa: 'No',
      legallyAllowedToWorkInUs: 'Yes',
      requiresUsSponsorship: 'No',
      requiresEuVisa: 'Yes',
      legallyAllowedToWorkInEu: 'No',
      requiresEuSponsorship: 'Yes',
    },
    workPreferences: {
      remoteWork: 'Yes',
      inPersonWork: 'Yes',
      openToRelocation: 'Yes',
      willingToCompleteAssessments: 'Yes',
      willingToUndergoDrugTests: 'Yes',
      willingToUndergoBackgroundChecks: 'Yes',
    },
    educationDetails: [
      {
        degree: 'Bachelor of Science',
        university: 'Stanford University',
        graduationYear: '2012',
        fieldOfStudy: 'Computer Science',
        gpa: '3.8',
      },
    ],
    experienceDetails: [
      {
        company: 'Tech Corp',
        position: 'Senior Software Engineer',
        employmentPeriod: '2018 - Present',
        location: 'San Francisco, CA',
        industry: 'Technology',
        keyResponsibilities: {
          leadership: 'Led development team',
          architecture: 'Designed microservices',
        },
        skillsAcquired: {
          backend: 'Node.js, TypeScript',
          cloud: 'AWS, GCP',
        },
      },
    ],
    availability: {
      noticePeriod: '2 weeks',
    },
    salaryExpectations: {
      salaryRangeUSD: '$150,000 - $180,000',
    },
    languages: [
      { language: 'English', proficiency: 'Native' },
      { language: 'Spanish', proficiency: 'Conversational' },
    ],
    skills: ['JavaScript', 'TypeScript', 'Python', 'React', 'Node.js'],
  };

  // Sample job for testing (matches actual types)
  const mockJob: Job = {
    title: 'Senior Software Engineer',
    company: 'Awesome Startup',
    location: 'San Francisco, CA',
    link: 'https://linkedin.com/jobs/view/123',
    applyMethod: 'Easy Apply',
    description: 'We are looking for a senior software engineer to lead our backend team...',
    summarizedDescription: 'Backend engineering role with team leadership',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    gptAnswerer = new GPTAnswerer(mockApiToken, mockApiUrl);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with API credentials', () => {
      expect(gptAnswerer).toBeInstanceOf(GPTAnswerer);
    });

    it('should create instance with optional status reporter', () => {
      const mockReporter = { incrementCreditsUsed: vi.fn() } as Pick<import('../../utils/status-reporter').StatusReporter, 'incrementCreditsUsed'>;
      const answerer = new GPTAnswerer(mockApiToken, mockApiUrl, mockReporter as import('../../utils/status-reporter').StatusReporter);
      expect(answerer).toBeInstanceOf(GPTAnswerer);
    });
  });

  describe('setResume', () => {
    it('should set resume context', () => {
      gptAnswerer.setResume(mockResume);
      // Resume is set internally - we verify by checking subsequent calls work
      expect(() => gptAnswerer.setResume(mockResume)).not.toThrow();
    });
  });

  describe('setJob', () => {
    it('should set job context', () => {
      gptAnswerer.setJob(mockJob);
      expect(gptAnswerer.jobDescription).toBe(mockJob.description);
    });

    it('should return empty string when no job is set', () => {
      expect(gptAnswerer.jobDescription).toBe('');
    });
  });

  describe('jobDescription getter', () => {
    it('should return job description when job is set', () => {
      gptAnswerer.setJob(mockJob);
      expect(gptAnswerer.jobDescription).toBe(mockJob.description);
    });

    it('should return empty string when job is null', () => {
      expect(gptAnswerer.jobDescription).toBe('');
    });
  });

  describe('answerFromOptions', () => {
    beforeEach(() => {
      gptAnswerer.setResume(mockResume);
      gptAnswerer.setJob(mockJob);
    });

    it('should call API and return selected option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'JavaScript' }),
      });

      const result = await gptAnswerer.answerFromOptions(
        'What is your preferred programming language?',
        ['JavaScript', 'Python', 'Java', 'Go']
      );

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toBe('JavaScript');
    });

    it('should handle API response that partially matches option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'Rust' }), // Not in options exactly
      });

      const result = await gptAnswerer.answerFromOptions(
        'What is your preferred language?',
        ['JavaScript', 'Python', 'Java']
      );

      // findBestMatch may find partial match or default to first option
      // Just verify it returns one of the valid options
      expect(['JavaScript', 'Python', 'Java']).toContain(result);
    });
  });

  describe('answerTextual', () => {
    beforeEach(() => {
      gptAnswerer.setResume(mockResume);
      gptAnswerer.setJob(mockJob);
    });

    it('should call API and return text response', async () => {
      const expectedResponse = 'I have 5 years of experience in software development.';
      // First call determines section, second generates answer
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ content: 'work' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ content: expectedResponse }),
        });

      const result = await gptAnswerer.answerTextual('Describe your experience');

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toBe(expectedResponse);
    });
  });

  describe('answerNumeric', () => {
    beforeEach(() => {
      gptAnswerer.setResume(mockResume);
      gptAnswerer.setJob(mockJob);
    });

    it('should call API and return numeric response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: '5' }),
      });

      const result = await gptAnswerer.answerNumeric('Years of experience');

      expect(result).toBe(5);
    });

    it('should return default value for non-numeric response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'five years' }),
      });

      const result = await gptAnswerer.answerNumeric('Years of experience');

      // Should handle parsing error gracefully
      expect(typeof result).toBe('number');
    });
  });

  describe('API error handling', () => {
    beforeEach(() => {
      gptAnswerer.setResume(mockResume);
      gptAnswerer.setJob(mockJob);
    });

    it('should throw error on API failure', async () => {
      // Mock all retry attempts with the same error response
      const errorResponse = {
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      };
      mockFetch.mockResolvedValue(errorResponse);

      await expect(
        gptAnswerer.answerNumeric('Test question')
      ).rejects.toThrow('Backend API error');
    });

    it('should throw error on network failure', async () => {
      // Mock all retry attempts with the same network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        gptAnswerer.answerNumeric('Test question')
      ).rejects.toThrow('Network error');
    });
  });

  describe('status reporter integration', () => {
    it('should increment credits used on successful API call', async () => {
      const mockReporter = { 
        incrementCreditsUsed: vi.fn(),
        reportStatus: vi.fn(),
      } as Pick<import('../../utils/status-reporter').StatusReporter, 'incrementCreditsUsed'>;
      const answerer = new GPTAnswerer(mockApiToken, mockApiUrl, mockReporter as import('../../utils/status-reporter').StatusReporter);
      answerer.setResume(mockResume);
      answerer.setJob(mockJob);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: '5' }),
      });

      await answerer.answerNumeric('Test question');

      expect(mockReporter.incrementCreditsUsed).toHaveBeenCalled();
    });
  });
});
