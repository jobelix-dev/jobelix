import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MOCK_OFFERS = [
  {
    id: 'offer-1',
    user_id: 'company-1',
    title: 'Frontend Intern',
    description: '3-month internship',
    created_at: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json(MOCK_OFFERS);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description } = body;
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const created = { id: `offer-${Date.now()}`, user_id: 'company-1', title, description, created_at: new Date().toISOString() };
  return NextResponse.json(created, { status: 201 });
}
