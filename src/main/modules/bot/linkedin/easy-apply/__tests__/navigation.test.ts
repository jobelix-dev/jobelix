/**
 * Navigation Handler Tests
 * 
 * Tests for modal state detection and navigation logic.
 * Uses Vitest mocking to simulate Playwright Page behavior.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import type { Page, Locator } from 'playwright';

// Import the class to test
import { NavigationHandler } from '../navigation';

// Create mock locator
function createMockLocator(options: { count?: number; visible?: boolean; text?: string; enabled?: boolean } = {}): Locator {
  const { count = 0, visible = true, text = '', enabled = true } = options;
  
  return {
    count: vi.fn().mockResolvedValue(count),
    isVisible: vi.fn().mockResolvedValue(visible),
    textContent: vi.fn().mockResolvedValue(text),
    isEnabled: vi.fn().mockResolvedValue(enabled),
    click: vi.fn().mockResolvedValue(undefined),
    first: vi.fn().mockReturnThis(),
    waitFor: vi.fn().mockResolvedValue(undefined),
    all: vi.fn().mockResolvedValue([]),
  } as unknown as Locator;
}

// Type for our mock page with helper method
interface MockPage extends Page {
  _setLocator: (selector: string, locator: Locator) => void;
}

// Create mock page
function createMockPage(): MockPage {
  const locatorMap = new Map<string, Locator>();
  
  const page = {
    locator: vi.fn((selector: string) => {
      if (locatorMap.has(selector)) {
        return locatorMap.get(selector)!;
      }
      return createMockLocator({ count: 0 });
    }),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    keyboard: {
      press: vi.fn().mockResolvedValue(undefined),
    },
    // Helper to set up locator responses (for testing)
    _setLocator: (selector: string, locator: Locator) => {
      locatorMap.set(selector, locator);
    },
  } as unknown as MockPage;
  
  return page;
}

describe('NavigationHandler', () => {
  let page: MockPage;
  let handler: NavigationHandler;

  beforeEach(() => {
    page = createMockPage();
    handler = new NavigationHandler(page);
  });

  describe('getModalState', () => {
    it('should return "closed" when modal is not present', async () => {
      // Default mock returns count: 0
      const state = await handler.getModalState();
      expect(state).toBe('closed');
    });

    it('should return "form" when Next button is visible', async () => {
      // Set up modal as open
      page._setLocator('[data-test-modal]', createMockLocator({ count: 1, visible: true }));
      
      // Set up Next button as visible
      page._setLocator('button[aria-label*="Continue to next step"]', createMockLocator({ 
        count: 1, 
        visible: true 
      }));
      
      const state = await handler.getModalState();
      expect(state).toBe('form');
    });

    it('should return "submit" when Submit button is visible', async () => {
      page._setLocator('[data-test-modal]', createMockLocator({ count: 1, visible: true }));
      page._setLocator('button[aria-label*="Submit application"]', createMockLocator({ 
        count: 1, 
        visible: true 
      }));
      
      const state = await handler.getModalState();
      expect(state).toBe('submit');
    });

    it('should return "review" when Review button is visible', async () => {
      page._setLocator('[data-test-modal]', createMockLocator({ count: 1, visible: true }));
      page._setLocator('button[aria-label*="Review"]', createMockLocator({ 
        count: 1, 
        visible: true 
      }));
      
      const state = await handler.getModalState();
      expect(state).toBe('review');
    });
  });

  describe('hasValidationErrors', () => {
    it('should return false when no errors present', async () => {
      const hasErrors = await handler.hasValidationErrors();
      expect(hasErrors).toBe(false);
    });

    it('should return true when error elements are visible', async () => {
      const errorLocator = createMockLocator({ 
        count: 1, 
        visible: true, 
        text: 'This field is required' 
      });
      // Mock the all() method to return array with this locator
      (errorLocator.all as Mock).mockResolvedValue([errorLocator]);
      
      page._setLocator('.artdeco-inline-feedback--error', errorLocator);
      
      const hasErrors = await handler.hasValidationErrors();
      expect(hasErrors).toBe(true);
    });
  });

  describe('isModalOpen', () => {
    it('should return true when modal is visible', async () => {
      page._setLocator('div.jobs-easy-apply-modal', createMockLocator({ count: 1, visible: true }));
      
      const isOpen = await handler.isModalOpen();
      expect(isOpen).toBe(true);
    });

    it('should return false when modal is not visible', async () => {
      page._setLocator('div.jobs-easy-apply-modal', createMockLocator({ count: 1, visible: false }));
      
      const isOpen = await handler.isModalOpen();
      expect(isOpen).toBe(false);
    });
  });
});
