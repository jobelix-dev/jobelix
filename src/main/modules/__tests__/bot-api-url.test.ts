import { describe, expect, it } from 'vitest';
import { getDefaultBotApiUrl, sanitizeBotApiUrl } from '../bot-api-url.js';

describe('bot-api-url', () => {
  describe('sanitizeBotApiUrl', () => {
    it('accepts trusted production endpoint and strips query/hash', () => {
      expect(
        sanitizeBotApiUrl('https://www.jobelix.fr/api/autoapply/gpt4?x=1#frag')
      ).toBe('https://www.jobelix.fr/api/autoapply/gpt4');
    });

    it('accepts trailing slash on endpoint', () => {
      expect(
        sanitizeBotApiUrl('https://jobelix.fr/api/autoapply/gpt4/')
      ).toBe('https://jobelix.fr/api/autoapply/gpt4');
    });

    it('accepts localhost http endpoint for development', () => {
      expect(
        sanitizeBotApiUrl('http://localhost:3000/api/autoapply/gpt4')
      ).toBe('http://localhost:3000/api/autoapply/gpt4');
    });

    it('rejects unsafe hosts and paths', () => {
      expect(sanitizeBotApiUrl('https://example.com/api/autoapply/gpt4')).toBeNull();
      expect(sanitizeBotApiUrl('https://www.jobelix.fr/api/autoapply/gpt4-other')).toBeNull();
      expect(sanitizeBotApiUrl('https://www.jobelix.fr/api/other')).toBeNull();
    });

    it('rejects non-http protocols and credentialed URLs', () => {
      expect(sanitizeBotApiUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeBotApiUrl('https://user:pass@www.jobelix.fr/api/autoapply/gpt4')).toBeNull();
    });
  });

  describe('getDefaultBotApiUrl', () => {
    it('returns production URL when packaged', () => {
      expect(getDefaultBotApiUrl(true)).toBe('https://www.jobelix.fr/api/autoapply/gpt4');
    });

    it('returns localhost URL in development', () => {
      expect(getDefaultBotApiUrl(false)).toBe('http://localhost:3000/api/autoapply/gpt4');
    });
  });
});
