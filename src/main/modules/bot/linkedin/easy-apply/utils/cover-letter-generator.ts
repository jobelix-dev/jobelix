/**
 * Cover Letter Generator - Generates PDF cover letters using AI
 */

import type { Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { createLogger } from '../../../utils/logger';

const log = createLogger('CoverLetterGenerator');

/** Minimum cover letter length to be valid */
const MIN_COVER_LETTER_LENGTH = 100;

/** Path to the most recently generated cover letter (for cleanup) */
let generatedPath: string | null = null;

/**
 * Generate a cover letter PDF using AI
 * 
 * Creates a temporary PDF file containing an AI-generated cover letter.
 * Uses Playwright to generate the PDF from HTML for proper formatting.
 * 
 * @param page - Playwright page for PDF generation
 * @param answerFn - Function to generate cover letter text
 * @returns Path to generated PDF, or null if generation fails
 */
export async function generateCoverLetterPdf(
  page: Page,
  answerFn: (question: string) => Promise<string | undefined>
): Promise<string | null> {
  try {
    log.debug('[COVER LETTER] Generating cover letter with GPT');

    // Generate cover letter text using GPT
    const coverLetterText = await answerFn('Write a cover letter for this job application');

    if (!coverLetterText || coverLetterText.length < MIN_COVER_LETTER_LENGTH) {
      log.warn('[COVER LETTER] Failed to generate cover letter text');
      return null;
    }

    // Create temporary PDF file path
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const pdfPath = path.join(tempDir, `cover_letter_${timestamp}.pdf`);

    // Format the cover letter as HTML
    const htmlContent = formatCoverLetterHtml(coverLetterText);

    // Use Playwright to generate PDF from HTML
    const context = page.context();
    const pdfPage = await context.newPage();

    try {
      await pdfPage.setContent(htmlContent, { waitUntil: 'networkidle' });
      await pdfPage.pdf({
        path: pdfPath,
        format: 'Letter',
        margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
        printBackground: true,
      });

      log.info(`[COVER LETTER] ✅ Created PDF at: ${pdfPath}`);
      generatedPath = pdfPath;

      return pdfPath;
    } finally {
      await pdfPage.close();
    }
  } catch (error) {
    log.error(`[COVER LETTER] Failed to generate PDF: ${error}`);
    return null;
  }
}

/**
 * Format cover letter text as HTML for PDF generation
 */
function formatCoverLetterHtml(text: string): string {
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      margin: 1in;
      color: #333;
    }
    p {
      margin-bottom: 12pt;
      text-align: justify;
    }
  </style>
</head>
<body>
  ${paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n')}
</body>
</html>`;
}

/**
 * Clean up any generated cover letter file
 */
export function cleanupGeneratedCoverLetter(): void {
  if (generatedPath && fs.existsSync(generatedPath)) {
    try {
      fs.unlinkSync(generatedPath);
      log.debug(`Cleaned up generated cover letter: ${generatedPath}`);
    } catch {
      // Ignore cleanup errors
    }
    generatedPath = null;
  }
}

/**
 * Get the path of the last generated cover letter
 */
export function getGeneratedCoverLetterPath(): string | null {
  return generatedPath;
}
