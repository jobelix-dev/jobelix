/**
 * Tests for lib/client/api.ts
 * 
 * Tests the ApiClient class with mocked fetch.
 * Covers request handling, error formatting, and API methods.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock fetch before importing api
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
import { api } from '../api';

function mockFetchResponse(data: unknown, status = 200) {
  const body = JSON.stringify(data);
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(body),
    blob: () => Promise.resolve(new Blob(['test'])),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ============================================================================
// Login
// ============================================================================

describe('api.login', () => {
  it('should POST to /api/auth/login', async () => {
    mockFetchResponse({ success: true });

    const result = await api.login({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', password: 'password123' }),
    }));
    expect(result.success).toBe(true);
  });

  it('should throw on failed login', async () => {
    mockFetchResponse({ error: 'Invalid credentials' }, 401);

    await expect(api.login({
      email: 'user@example.com',
      password: 'wrong',
    })).rejects.toThrow('Invalid credentials');
  });
});

// ============================================================================
// Signup
// ============================================================================

describe('api.signup', () => {
  it('should POST to /api/auth/signup', async () => {
    mockFetchResponse({ success: true, userId: '123' });

    const result = await api.signup({
      email: 'user@example.com',
      password: 'password123',
      role: 'student',
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/signup', expect.objectContaining({
      method: 'POST',
    }));
    expect(result.success).toBe(true);
    expect(result.userId).toBe('123');
  });
});

// ============================================================================
// Logout
// ============================================================================

describe('api.logout', () => {
  it('should POST to /api/auth/logout', async () => {
    mockFetchResponse({ success: true });

    const result = await api.logout();

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({
      method: 'POST',
    }));
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Update Password
// ============================================================================

describe('api.updatePassword', () => {
  it('should POST to /api/auth/update-password', async () => {
    mockFetchResponse({ success: true });

    const result = await api.updatePassword('newpassword123');

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/update-password', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ password: 'newpassword123' }),
    }));
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Delete Account
// ============================================================================

describe('api.deleteAccount', () => {
  it('should DELETE to /api/auth/account', async () => {
    mockFetchResponse({ success: true });

    const result = await api.deleteAccount('securePassword123');

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/account', expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ confirmation: 'DELETE', password: 'securePassword123' }),
    }));
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Get Profile
// ============================================================================

describe('api.getProfile', () => {
  it('should GET /api/auth/profile', async () => {
    mockFetchResponse({
      profile: { id: '123', email: 'user@example.com', role: 'student' },
    });

    const result = await api.getProfile();

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/profile', expect.objectContaining({
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
      }),
    }));
    expect(result.profile?.id).toBe('123');
  });
});

// ============================================================================
// Resume operations
// ============================================================================

describe('api.getResume', () => {
  it('should GET /api/student/resume', async () => {
    mockFetchResponse({ data: { student_id: '123', file_name: 'resume.pdf', created_at: '2024-01-01' } });

    const result = await api.getResume();
    expect(result.data?.file_name).toBe('resume.pdf');
  });
});

describe('api.downloadResume', () => {
  it('should GET /api/student/resume/download and return blob', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['pdf content'], { type: 'application/pdf' })),
    });

    const result = await api.downloadResume();
    expect(result).toBeInstanceOf(Blob);
  });

  it('should throw on download failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Resume not found' }),
      text: () => Promise.resolve(JSON.stringify({ error: 'Resume not found' })),
    });

    await expect(api.downloadResume()).rejects.toThrow('Resume not found');
  });
});

// ============================================================================
// Profile draft operations
// ============================================================================

describe('api.getDraft', () => {
  it('should GET /api/student/profile/draft', async () => {
    mockFetchResponse({ draft: null });

    const result = await api.getDraft();
    expect(result.draft).toBeNull();
  });
});

describe('api.extractResumeData', () => {
  it('should POST to /api/student/profile/draft/extract', async () => {
    mockFetchResponse({
      success: true,
      draftId: 'draft-123',
      extracted: {},
      needsReview: true,
    });

    const result = await api.extractResumeData();
    expect(mockFetch).toHaveBeenCalledWith('/api/student/profile/draft/extract', expect.objectContaining({
      method: 'POST',
    }));
    expect(result.success).toBe(true);
  });
});

describe('api.updateDraft', () => {
  it('should PUT to /api/student/profile/draft', async () => {
    mockFetchResponse({ success: true, draft: {} });

    const result = await api.updateDraft('draft-123', { student_name: 'John Doe' });

    expect(mockFetch).toHaveBeenCalledWith('/api/student/profile/draft', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ draftId: 'draft-123', updates: { student_name: 'John Doe' } }),
    }));
    expect(result.success).toBe(true);
  });
});

describe('api.finalizeProfile', () => {
  it('should POST to /api/student/profile/draft/finalize', async () => {
    mockFetchResponse({ success: true });

    const result = await api.finalizeProfile('draft-123');

    expect(mockFetch).toHaveBeenCalledWith('/api/student/profile/draft/finalize', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ draftId: 'draft-123' }),
    }));
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Error handling
// ============================================================================

describe('error handling', () => {
  it('should extract error from { error: "message" } format', async () => {
    mockFetchResponse({ error: 'Not authorized' }, 403);

    await expect(api.getProfile()).rejects.toThrow('Not authorized');
  });

  it('should extract error from validation errors array', async () => {
    mockFetchResponse({
      message: 'Validation failed',
      errors: [
        { path: 'email', message: 'Invalid email format' },
        { path: 'password', message: 'Required' },
      ],
    }, 400);

    await expect(api.login({
      email: '',
      password: '',
    })).rejects.toThrow('Email: Invalid email format');
  });

  it('should handle validation errors without path', async () => {
    mockFetchResponse({
      message: 'Validation failed',
      errors: [
        { path: '', message: 'Request body is invalid' },
      ],
    }, 400);

    await expect(api.login({
      email: '',
      password: '',
    })).rejects.toThrow('Request body is invalid');
  });

  it('should fall back to message field', async () => {
    mockFetchResponse({ message: 'Something went wrong' }, 500);

    await expect(api.getProfile()).rejects.toThrow('Something went wrong');
  });

  it('should use generic message as last resort', async () => {
    mockFetchResponse({}, 500);

    await expect(api.getProfile()).rejects.toThrow('Request failed');
  });

  it('should handle empty validation errors array', async () => {
    mockFetchResponse({
      message: 'Validation failed',
      errors: [],
    }, 400);

    await expect(api.getProfile()).rejects.toThrow('Validation failed');
  });
});
