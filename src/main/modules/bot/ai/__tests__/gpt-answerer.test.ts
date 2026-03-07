/**
 * Tests for GPT Answerer
 *
 * Verifies that GPTAnswerer correctly delegates to BackendAPIClient,
 * parses responses, handles API errors, and integrates with StatusReporter.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GPTAnswerer } from '../gpt-answerer';
import type { Resume, Job } from '../../types';

const { mockChatCompletion } = vi.hoisted(() => ({
  mockChatCompletion: vi.fn(),
}));

vi.mock('../backend-client', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  BackendAPIClient: vi.fn().mockImplementation(function(this: any) {
    this.chatCompletion = mockChatCompletion;
  }),
  InsufficientCreditsError: class InsufficientCreditsError extends Error {
    public readonly statusCode = 402;
    public readonly code = 'INSUFFICIENT_CREDITS';
    constructor(message = 'Insufficient credits') {
      super(message);
      this.name = 'InsufficientCreditsError';
    }
  },
}));

describe('GPTAnswerer', () => {
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
    educationDetails: [{
      degree: 'Bachelor of Science',
      university: 'Stanford University',
      graduationYear: '2012',
      fieldOfStudy: 'Computer Science',
      gpa: '3.8',
    }],
    experienceDetails: [{
      company: 'Tech Corp',
      position: 'Senior Software Engineer',
      employmentPeriod: '2018 - Present',
      location: 'San Francisco, CA',
      industry: 'Technology',
      keyResponsibilities: { leadership: 'Led development team' },
      skillsAcquired: { backend: 'Node.js, TypeScript' },
    }],
    availability: { noticePeriod: '2 weeks' },
    salaryExpectations: { salaryRangeUSD: '$150,000 - $180,000' },
    languages: [{ language: 'English', proficiency: 'Native' }],
    skills: ['JavaScript', 'TypeScript', 'Python'],
  };

  const mockJob: Job = {
    title: 'Senior Software Engineer',
    company: 'Awesome Startup',
    location: 'San Francisco, CA',
    link: 'https://linkedin.com/jobs/view/123',
    applyMethod: 'Easy Apply',
    description: 'We are looking for a senior software engineer to lead our backend team...',
    summarizedDescription: 'Backend engineering role with team leadership',
  };

  let gptAnswerer: GPTAnswerer;

  beforeEach(() => {
    vi.clearAllMocks();
    gptAnswerer = new GPTAnswerer('test-api-token', 'https://api.example.com/chat');
    gptAnswerer.setResume(mockResume);
    gptAnswerer.setJob(mockJob);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setJob / jobDescription', () => {
    it('should expose job description after setJob', () => {
      expect(gptAnswerer.jobDescription).toBe(mockJob.description);
    });

    it('should return empty string when no job is set', () => {
      const fresh = new GPTAnswerer('token', 'https://api.example.com/chat');
      expect(fresh.jobDescription).toBe('');
    });
  });

  describe('answerFromOptions', () => {
    it('should return the option that matches the API response', async () => {
      mockChatCompletion.mockResolvedValueOnce({
        content: 'JavaScript',
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
        model: 'gpt-4o-mini',
        finish_reason: 'stop',
      });

      const result = await gptAnswerer.answerFromOptions(
        'What is your preferred programming language?',
        ['JavaScript', 'Python', 'Java', 'Go']
      );

      expect(mockChatCompletion).toHaveBeenCalled();
      expect(result).toBe('JavaScript');
    });

    it('should fall back to a valid option when the response does not match exactly', async () => {
      mockChatCompletion.mockResolvedValueOnce({
        content: 'Rust',
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
        model: 'gpt-4o-mini',
        finish_reason: 'stop',
      });

      const options = ['JavaScript', 'Python', 'Java'];
      const result = await gptAnswerer.answerFromOptions('Preferred language?', options);

      expect(options).toContain(result);
    });
  });

  describe('answerTextual', () => {
    it('should return the text content from the API response', async () => {
      const expected = 'I have 5 years of experience in software development.';
      mockChatCompletion
        .mockResolvedValueOnce({
          content: 'work',
          usage: { input_tokens: 10, output_tokens: 3, total_tokens: 13 },
          model: 'gpt-4o-mini',
          finish_reason: 'stop',
        })
        .mockResolvedValueOnce({
          content: expected,
          usage: { input_tokens: 50, output_tokens: 20, total_tokens: 70 },
          model: 'gpt-4o-mini',
          finish_reason: 'stop',
        });

      const result = await gptAnswerer.answerTextual('Describe your experience');

      expect(mockChatCompletion).toHaveBeenCalled();
      expect(result).toBe(expected);
    });
  });

  describe('answerNumeric', () => {
    it('should parse and return the numeric value from the API response', async () => {
      mockChatCompletion.mockResolvedValueOnce({
        content: '5',
        usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12 },
        model: 'gpt-4o-mini',
        finish_reason: 'stop',
      });

      const result = await gptAnswerer.answerNumeric('Years of experience');

      expect(result).toBe(5);
    });

    it('should return a number even when the response is not purely numeric', async () => {
      mockChatCompletion.mockResolvedValueOnce({
        content: 'five years',
        usage: { input_tokens: 10, output_tokens: 4, total_tokens: 14 },
        model: 'gpt-4o-mini',
        finish_reason: 'stop',
      });

      const result = await gptAnswerer.answerNumeric('Years of experience');

      expect(typeof result).toBe('number');
    });
  });

  describe('API error handling', () => {
    it('should propagate backend API errors', async () => {
      mockChatCompletion.mockRejectedValue(new Error('Backend API error: 500 Internal Server Error'));

      await expect(
        gptAnswerer.answerNumeric('Test question')
      ).rejects.toThrow('Backend API error');
    });

    it('should propagate network errors', async () => {
      mockChatCompletion.mockRejectedValue(new Error('Network error'));

      await expect(
        gptAnswerer.answerNumeric('Test question')
      ).rejects.toThrow('Network error');
    });
  });

  describe('status reporter integration', () => {
    it('should increment credits used after a successful API call', async () => {
      const mockReporter = {
        incrementCreditsUsed: vi.fn(),
        reportStatus: vi.fn(),
      };
      const answerer = new GPTAnswerer(
        'test-api-token',
        'https://api.example.com/chat',
        mockReporter as import('../../utils/status-reporter').StatusReporter
      );
      answerer.setResume(mockResume);
      answerer.setJob(mockJob);

      mockChatCompletion.mockResolvedValueOnce({
        content: '5',
        usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12 },
        model: 'gpt-4o-mini',
        finish_reason: 'stop',
      });

      await answerer.answerNumeric('Test question');

      expect(mockReporter.incrementCreditsUsed).toHaveBeenCalled();
    });
  });
});
