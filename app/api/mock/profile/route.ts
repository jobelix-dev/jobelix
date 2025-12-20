import { NextResponse } from 'next/server';

export async function GET() {
  // return a mock profile (in real app this would use auth)
  const profile = { id: '00000000-0000-0000-0000-000000000000', role: 'student', created_at: new Date().toISOString() };
  return NextResponse.json(profile);
}
