/**
 * Global Test Setup
 * 
 * Mocks server-only module and sets up environment for testing.
 * This file is loaded before every test file via vitest setupFiles.
 */

import { vi } from 'vitest';

// Mock "server-only" — this package throws at import time outside Next.js server context
vi.mock('server-only', () => ({}));

// Mock "electron" — bot modules import { app } from 'electron' and { BrowserWindow } from 'electron'
// which don't exist in a Node/Vitest environment. This stub prevents import-time crashes.
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/jobelix-test'),
    on: vi.fn(),
    getName: vi.fn(() => 'jobelix-test'),
    getVersion: vi.fn(() => '0.0.0-test'),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}));
