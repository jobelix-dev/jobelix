/**
 * Easy Applier Tests
 * 
 * Tests for the main EasyApplier class.
 * Tests constructor signature compatibility with JobManager.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Page, Locator } from 'playwright';
import type { StatusReporter } from '../../../utils/status-reporter';
import type { GPTAnswererLike } from '../form-handler';

// Import the class to test
import { EasyApplier, LinkedInEasyApplier } from '../easy-applier';

// Create mock locator
function createMockLocator(options: { count?: number; visible?: boolean; text?: string } = {}): Locator {
  const { count = 0, visible = true, text = '' } = options;
  
  return {
    count: vi.fn().mockResolvedValue(count),
    isVisible: vi.fn().mockResolvedValue(visible),
    textContent: vi.fn().mockResolvedValue(text),
    click: vi.fn().mockResolvedValue(undefined),
    first: vi.fn().mockReturnThis(),
  } as unknown as Locator;
}

// Create mock page
function createMockPage(): Page {
  return {
    locator: vi.fn().mockReturnValue(createMockLocator()),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    keyboard: {
      press: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as Page;
}

// Create mock GPT answerer that matches GPTAnswererLike interface
function createMockGptAnswerer(): GPTAnswererLike {
  return {
    resume: null,
    answerTextual: vi.fn().mockResolvedValue('test answer'),
    answerFromOptions: vi.fn().mockResolvedValue('Option 1'),
    answerNumeric: vi.fn().mockResolvedValue(3),
    answerCheckboxQuestion: vi.fn().mockResolvedValue('yes'),
    answerFromOptionsWithRetry: vi.fn().mockResolvedValue('Option 2'),
    answerTextualWithRetry: vi.fn().mockResolvedValue('retry answer'),
    answerNumericWithRetry: vi.fn().mockResolvedValue(5),
  };
}

describe('EasyApplier', () => {
  let page: Page;
  let gptAnswerer: GPTAnswererLike;

  beforeEach(() => {
    page = createMockPage();
    gptAnswerer = createMockGptAnswerer();
  });

  describe('constructor', () => {
    it('should create instance with minimal parameters', () => {
      const applier = new EasyApplier(page, gptAnswerer);
      expect(applier).toBeInstanceOf(EasyApplier);
    });

    it('should create instance with saved answers', () => {
      const savedAnswers = [
        { questionType: 'text', questionText: 'Experience', answer: '5 years' },
      ];
      const applier = new EasyApplier(page, gptAnswerer, savedAnswers);
      expect(applier).toBeInstanceOf(EasyApplier);
    });

    it('should create instance with resume path', () => {
      const applier = new EasyApplier(page, gptAnswerer, [], '/path/to/resume.pdf');
      expect(applier).toBeInstanceOf(EasyApplier);
    });

    it('should create instance with all parameters (JobManager signature)', () => {
      const savedAnswers = [
        { questionType: 'text', questionText: 'Experience', answer: '5 years' },
      ];
      const recordCallback = vi.fn();
      const reporter = { sendHeartbeat: vi.fn(), incrementJobsApplied: vi.fn() } as unknown as StatusReporter;
      
      // This signature must match what JobManager uses
      const applier = new EasyApplier(
        page,
        gptAnswerer,
        savedAnswers,
        '/path/to/resume.pdf',
        recordCallback,
        reporter
      );
      expect(applier).toBeInstanceOf(EasyApplier);
    });
  });

  describe('LinkedInEasyApplier alias', () => {
    it('should be same class as EasyApplier', () => {
      expect(LinkedInEasyApplier).toBe(EasyApplier);
    });

    it('should create instance with JobManager signature', () => {
      const applier = new LinkedInEasyApplier(
        page,
        gptAnswerer,
        [],
        '/path/to/resume.pdf',
        vi.fn(),
        undefined
      );
      expect(applier).toBeInstanceOf(EasyApplier);
    });
  });

  describe('hasEasyApply', () => {
    it('should return true when Easy Apply button is visible', async () => {
      const mockLocator = createMockLocator({ count: 1, visible: true });
      (page.locator as ReturnType<typeof vi.fn>).mockReturnValue(mockLocator);
      
      const applier = new EasyApplier(page, gptAnswerer);
      const hasEasyApply = await applier.hasEasyApply();
      
      expect(hasEasyApply).toBe(true);
    });

    it('should return false when Easy Apply button is not visible', async () => {
      const mockLocator = createMockLocator({ count: 1, visible: false });
      (page.locator as ReturnType<typeof vi.fn>).mockReturnValue(mockLocator);
      
      const applier = new EasyApplier(page, gptAnswerer);
      const hasEasyApply = await applier.hasEasyApply();
      
      expect(hasEasyApply).toBe(false);
    });

    it('should return false when Easy Apply button does not exist', async () => {
      const mockLocator = createMockLocator({ count: 0 });
      (page.locator as ReturnType<typeof vi.fn>).mockReturnValue(mockLocator);
      
      const applier = new EasyApplier(page, gptAnswerer);
      const hasEasyApply = await applier.hasEasyApply();
      
      expect(hasEasyApply).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update config with new values', () => {
      const applier = new EasyApplier(page, gptAnswerer);
      
      // Should not throw
      applier.updateConfig({
        maxPages: 20,
        dryRun: true,
      });
    });

    it('should update resume path', () => {
      const applier = new EasyApplier(page, gptAnswerer);
      
      // Should not throw
      applier.updateConfig({
        resumePath: '/new/path/to/resume.pdf',
      });
    });
  });
});
