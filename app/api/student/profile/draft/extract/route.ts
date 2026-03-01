/**
 * Resume Data Extraction API Route
 *
 * Route: POST /api/student/profile/draft/extract
 * - Authenticates user
 * - Loads uploaded resume from storage
 * - Extracts text/links from PDF
 * - Runs section-by-section LLM extraction
 * - Persists merged draft data
 */

import "server-only";

export const maxDuration = 60;

// Must run before PDF.js is loaded.
import '@/lib/server/pdfPolyfills';

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { authenticateRequest } from '@/lib/server/auth';
import { RESUME_EXTRACTION_STEPS } from '@/lib/shared/extractionSteps';
import { setExtractionProgress } from '@/lib/server/extractionProgress';
import { checkRateLimit, logApiCall, rateLimitExceededResponse } from '@/lib/server/rateLimiting';
import { enforceSameOrigin } from '@/lib/server/csrf';
import {
  extractResumeContent,
  extractResumeDataBySections,
  type ExistingDraftData,
} from '@/lib/server/resumeExtractionService';
import { API_RATE_LIMIT_POLICIES } from '@/lib/shared/rateLimitPolicies';

let openaiInstance: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiInstance;
}

export async function POST(request: NextRequest) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

    const { user, supabase } = auth;
    const rateLimitConfig = API_RATE_LIMIT_POLICIES.resumeExtraction;

    const rateLimitResult = await checkRateLimit(user.id, rateLimitConfig);
    if (rateLimitResult.error) return rateLimitResult.error;
    if (!rateLimitResult.data.allowed) {
      return rateLimitExceededResponse(rateLimitConfig, rateLimitResult.data);
    }

    const updateProgress = (stepIndex: number, complete = false) => {
      const step = RESUME_EXTRACTION_STEPS[stepIndex] || 'Processing';
      const progress = Math.round(((stepIndex + 1) / RESUME_EXTRACTION_STEPS.length) * 100);
      setExtractionProgress(user.id, { stepIndex, step, progress, complete });
    };

    updateProgress(0);

    const filePath = `${user.id}/resume.pdf`;
    const [existingDraftResult, resumeFileResult] = await Promise.all([
      supabase
        .from('student_profile_draft')
        .select('*')
        .eq('student_id', user.id)
        .single(),
      supabase.storage
        .from('resumes')
        .download(filePath),
    ]);

    const existingDraft = existingDraftResult.data;
    const { data: fileData, error: downloadError } = resumeFileResult;

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Resume file not found' }, { status: 404 });
    }

    updateProgress(1);

    let resumeText: string;
    let linksInfo: string;
    try {
      const extracted = await extractResumeContent(fileData);
      resumeText = extracted.resumeText;
      linksInfo = extracted.linksInfo;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'RESUME_FILE_TOO_LARGE') {
        return NextResponse.json({ error: 'Resume file is too large to process' }, { status: 400 });
      }
      if (message === 'RESUME_TEXT_EMPTY') {
        return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
      }
      throw error;
    }

    updateProgress(2);
    console.log('[Resume Extraction] Starting section-by-section extraction');

    const extractedData = await extractResumeDataBySections({
      openai: getOpenAI(),
      resumeText,
      linksInfo,
      existingDraft: (existingDraft ?? null) as ExistingDraftData | null,
      onProgress: (stepIndex) => updateProgress(stepIndex),
    });

    updateProgress(12);

    const { data: draftData, error: draftError } = await supabase
      .from('student_profile_draft')
      .upsert(
        {
          student_id: user.id,
          student_name: extractedData.student_name,
          phone_number: extractedData.phone_number,
          phone_country_code: extractedData.phone_country_code,
          email: extractedData.email,
          address: extractedData.address,
          education: extractedData.education,
          experience: extractedData.experience,
          projects: extractedData.projects,
          skills: extractedData.skills,
          languages: extractedData.languages,
          publications: extractedData.publications,
          certifications: extractedData.certifications,
          social_links: extractedData.social_links,
          status: 'editing',
        },
        {
          onConflict: 'student_id',
        }
      )
      .select()
      .single();

    if (draftError) {
      console.error('Failed to save draft:', draftError);
      return NextResponse.json({ error: 'Failed to save extracted data' }, { status: 500 });
    }

    console.log('[Resume Extraction] Completed and saved draft');
    updateProgress(13, true);

    await logApiCall(user.id, rateLimitConfig.endpoint);

    return NextResponse.json({
      success: true,
      draftId: draftData.id,
      extracted: extractedData,
      needsReview: false,
    });
  } catch (error: unknown) {
    console.error('Resume extraction error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      type: error?.constructor?.name,
    });

    if (errorMessage.includes('OPENAI_API_KEY')) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return NextResponse.json(
        { error: 'AI service rate limited, please try again later' },
        { status: 429 }
      );
    }

    if (errorMessage.includes('Invalid PDF') || errorMessage.includes('password')) {
      return NextResponse.json(
        { error: 'Invalid or password-protected PDF file' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to extract resume data',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
