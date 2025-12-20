import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  // In mock, accept the form data and return a fake storage_path
  const form = await req.formData();
  const file = form.get('file');
  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });

  // In a real backend you'd upload to Supabase storage and return metadata
  return NextResponse.json({ storage_path: 'resumes/mock-user/resume.pdf', filename: 'resume.pdf', uploaded_at: new Date().toISOString() });
}
