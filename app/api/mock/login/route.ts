import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 });
  }

  // Mock login: accept any email/password and return a fake session
  const mockSession = {
    user: {
      id: 'mock-user-id-123',
      email,
    },
    access_token: 'mock-access-token',
  };

  const profile = {
    id: 'mock-user-id-123',
    role: 'student', // default to student for mock
    created_at: new Date().toISOString(),
  };

  return NextResponse.json({ success: true, session: mockSession, profile });
}
