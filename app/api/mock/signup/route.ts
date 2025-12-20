import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, role } = body;
  // simple validation
  if (!email || !role) {
    return NextResponse.json({ success: false, error: 'missing email or role' }, { status: 400 });
  }

  // mock created user id
  const userId = randomUUID();

  const profile = { id: userId, role, created_at: new Date().toISOString() };

  // Return a simplified signup response. In real backend you'd create auth user and profile.
  return NextResponse.json({ success: true, userId, profile });
}
