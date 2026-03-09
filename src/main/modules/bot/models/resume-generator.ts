/**
 * Resume Generation Utilities
 * 
 * Generates custom PDF resumes for each job application using Puppeteer.
 * Port of Python's src/resume/generator.py
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { Page } from 'playwright-core';
import { createLogger } from '../utils/logger';
import { getTailoredResumesPath } from '../utils/paths';
import { RESUME_CSS } from './resume-styles';
import { getResumeSectionLabels } from '../utils/language-labels';

const log = createLogger('ResumeGenerator');

/**
 * Type definitions for resume config structures
 */
interface Location {
  city?: string;
  countryCode?: string;
}

interface ProfileLink {
  network: string;
  url: string;
}

interface BasicsSection {
  name?: string;
  label?: string;
  email?: string;
  phone?: string;
  summary?: string;
  location?: Location;
  profiles?: ProfileLink[];
}

interface WorkItem {
  name?: string;
  company?: string;
  position?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  description?: string;
  highlights?: string[];
  location?: string;
}

interface EducationItem {
  institution?: string;
  studyType?: string;
  area?: string;
  startDate?: string;
  endDate?: string;
  score?: string;
}

interface ProjectItem {
  name?: string;
  description?: string;
  url?: string;
}

interface CertificateItem {
  name?: string;
  title?: string;
  issuer?: string;
}

interface SkillSection {
  name?: string;
  keywords?: string[];
}

interface ResumeConfig {
  basics?: BasicsSection;
  personal_information?: BasicsSection;
  work?: WorkItem[];
  experience_details?: WorkItem[];
  education?: EducationItem[];
  education_details?: EducationItem[];
  projects?: ProjectItem[];
  skills?: SkillSection[];
  certificates?: CertificateItem[];
}

/**
 * Options for resume generation
 */
export interface ResumeGenerationOptions {
  companyName: string;
  jobTitle: string;
  tailoredConfigYaml: string;
  outputDir?: string;
  scoresJson?: string;
  page?: Page; // Playwright page for PDF generation
  /** Target language for resume labels and content (ISO 639-1 code, e.g., 'en', 'fr', 'de') */
  language?: string;
}

/**
 * Result of resume generation
 */
export interface ResumeGenerationResult {
  pdfPath: string;
  yamlPath: string;
  scoresPath?: string;
}

/**
 * Generate a tailored PDF resume for a specific company and job
 */
export async function generateTailoredResume(
  options: ResumeGenerationOptions
): Promise<ResumeGenerationResult> {
  const { companyName, jobTitle, tailoredConfigYaml, outputDir, scoresJson, page, language } = options;

  log.info(`Starting resume generation for ${companyName} - ${jobTitle}`);
  log.debug(`Config YAML size: ${tailoredConfigYaml.length} bytes`);

  // Determine output directory
  const outputPath = outputDir || getTailoredResumesPath();
  
  // Ensure output directory exists
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  log.debug(`Output directory: ${outputPath}`);

  // Create safe filenames
  const safeCompanyName = sanitizeFilename(companyName);
  const safeJobTitle = sanitizeFilename(jobTitle);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];

  const baseFilename = `${safeCompanyName}_${safeJobTitle}_${timestamp}`;
  const configFilename = `${baseFilename}.yaml`;
  const pdfFilename = `${baseFilename}.pdf`;
  const scoresFilename = `${baseFilename}_scores.json`;

  const yamlPath = path.join(outputPath, configFilename);
  const pdfPath = path.join(outputPath, pdfFilename);
  const scoresPath = path.join(outputPath, scoresFilename);

  log.debug(`Config file: ${yamlPath}`);
  log.debug(`PDF file: ${pdfPath}`);
  if (scoresJson) {
    log.debug(`Scores file: ${scoresPath}`);
  }

  // Save the tailored configuration
  try {
    fs.writeFileSync(yamlPath, tailoredConfigYaml, 'utf-8');
    log.info(`Saved tailored config: ${yamlPath}`);
  } catch (error) {
    log.error(`Failed to save tailored config: ${error}`);
    throw error;
  }

  // Save scoring data if provided
  if (scoresJson) {
    try {
      fs.writeFileSync(scoresPath, scoresJson, 'utf-8');
      log.info(`Saved scoring data: ${scoresPath}`);
    } catch (error) {
      log.warn(`Failed to save scoring data: ${error}`);
      // Don't fail the entire process
    }
  }

  // Generate PDF from YAML
  try {
    log.info('Generating resume PDF');
    if (language && language !== 'en') {
      log.info(`Resume language: ${language}`);
    }
    
    if (page) {
      // Use provided Playwright page
      await generatePdfWithPlaywright(tailoredConfigYaml, pdfPath, page, companyName, jobTitle, language);
    } else {
      // Fallback to HTML-based generation without browser
      await generatePdfWithHtml(tailoredConfigYaml, pdfPath, companyName, jobTitle, language);
    }

    // Verify file was created
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      log.debug(`PDF file size: ${stats.size} bytes`);
      log.info(`✅ Resume generated successfully: ${pdfPath}`);
    } else {
      throw new Error(`PDF file was not created at expected path: ${pdfPath}`);
    }

    return {
      pdfPath,
      yamlPath,
      scoresPath: scoresJson ? scoresPath : undefined,
    };
  } catch (error) {
    log.error(`❌ Error generating resume: ${error}`);
    throw new Error(`Failed to generate resume for ${companyName}: ${error}`);
  }
}

/**
 * Generate PDF using Playwright page
 * Creates a new page to avoid Trusted Types policy issues from LinkedIn
 */
async function generatePdfWithPlaywright(
  yamlContent: string,
  outputPath: string,
  page: Page,
  companyName: string,
  jobTitle: string,
  language = 'en'
): Promise<void> {
  const config = yaml.load(yamlContent) as ResumeConfig;
  const html = generateResumeHtml(config, companyName, jobTitle, language);

  // Create a NEW page for PDF generation to avoid Trusted Types policy from LinkedIn
  const browser = page.context().browser();
  if (!browser) {
    throw new Error('Browser not available for PDF generation');
  }
  
  const pdfPage = await browser.newPage();
  
  try {
    // Set HTML content on the new page (no Trusted Types restrictions)
    await pdfPage.setContent(html, { waitUntil: 'networkidle' });

    // Generate PDF
    await pdfPage.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    });

    log.info('PDF generated with Playwright');
  } finally {
    // Always close the PDF page
    await pdfPage.close();
  }
}

/**
 * Generate PDF using simple HTML (fallback without browser)
 */
async function generatePdfWithHtml(
  yamlContent: string,
  outputPath: string,
  companyName: string,
  jobTitle: string,
  language = 'en'
): Promise<void> {
  const config = yaml.load(yamlContent) as ResumeConfig;
  const html = generateResumeHtml(config, companyName, jobTitle, language);

  // Save HTML temporarily (for debugging or external PDF generation)
  const htmlPath = outputPath.replace('.pdf', '.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');
  
  log.warn('No browser page provided - HTML saved to: ' + htmlPath);
  log.warn('PDF generation requires a browser. Please provide a Playwright page or use external PDF converter.');
  
  throw new Error('PDF generation requires a browser page. Provide options.page parameter.');
}

/**
 * Generate HTML resume from config.
 *
 * Single-column, ATS-friendly layout:
 * - No sidebar, no tables, no icons, no decorative graphics
 * - Contact info on one line under the name
 * - Section headings: small-caps uppercase with a thin rule
 * - Experience/education: title | org on one line, date right-aligned
 * - Skills: "Category: item, item, item" plain text rows
 */
function generateResumeHtml(config: ResumeConfig, companyName: string, jobTitle: string, language = 'en'): string {
  const labels = getResumeSectionLabels(language);

  const basics = config.basics || config.personal_information || {};
  const work = config.work || config.experience_details || [];
  const education = config.education || config.education_details || [];
  const projects = config.projects || [];
  const skills = config.skills || [];
  const certificates = config.certificates || [];

  // Separate language entries from technical skill groups
  const languageGroup = skills.find((s: SkillSection) => s.name === 'Languages');
  const languageEntries = languageGroup?.keywords || [];
  const technicalSkills = skills.filter((s: SkillSection) => s.name !== 'Languages');

  // ── Contact line ─────────────────────────────────────────────────────────
  const contactParts: string[] = [];
  if (basics.email) contactParts.push(`<a href="mailto:${escapeHtml(basics.email)}">${escapeHtml(basics.email)}</a>`);
  if (basics.phone) contactParts.push(escapeHtml(basics.phone));
  if (basics.location?.city) contactParts.push(escapeHtml(basics.location.city));
  for (const p of (basics.profiles || [])) {
    const label = escapeHtml(p.network);
    const url = escapeHtml(p.url);
    contactParts.push(`<a href="${url}">${label}</a>`);
  }
  const contactHtml = contactParts.join('<span class="contact-sep">·</span>');

  // ── Experience ────────────────────────────────────────────────────────────
  const workHtml = work.map((job: WorkItem) => {
    const title = escapeHtml(job.position || job.title || '');
    const org = escapeHtml(job.company || job.name || '');
    const location = job.location ? escapeHtml(job.location) : '';
    const metaParts = [location, formatDateRange(job.startDate, job.endDate)].filter(Boolean);
    const summary = job.summary || job.description || '';
    const highlightsHtml = job.highlights && job.highlights.length > 0
      ? `<ul class="bullets">${job.highlights.map((h: string) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>`
      : '';
    const summaryHtml = summary && !highlightsHtml
      ? `<p class="entry-summary">${escapeHtml(summary)}</p>`
      : '';
    return `
      <div class="entry">
        <div class="entry-header">
          <div class="entry-left">
            <span class="entry-title">${title}</span>
            ${org ? `<span class="entry-title-sep">·</span><span class="entry-org">${org}</span>` : ''}
          </div>
          <span class="entry-meta">${escapeHtml(metaParts.join(' · '))}</span>
        </div>
        ${summaryHtml}${highlightsHtml}
      </div>`;
  }).join('');

  // ── Education ─────────────────────────────────────────────────────────────
  const educationHtml = education.map((edu: EducationItem) => {
    const degree = [edu.studyType, edu.area].filter((s): s is string => Boolean(s)).map(escapeHtml).join(', ');
    const institution = escapeHtml(edu.institution || '');
    const date = formatDateRange(edu.startDate, edu.endDate);
    const score = edu.score ? ` — GPA ${escapeHtml(edu.score)}` : '';
    return `
      <div class="entry">
        <div class="entry-header">
          <div class="entry-left">
            <span class="entry-title">${degree}</span>
            ${institution ? `<span class="entry-title-sep">·</span><span class="entry-org">${institution}${score}</span>` : ''}
          </div>
          <span class="entry-meta">${escapeHtml(date)}</span>
        </div>
      </div>`;
  }).join('');

  // ── Skills ────────────────────────────────────────────────────────────────
  const skillRowsHtml = technicalSkills
    .filter((g: SkillSection) => g.keywords && g.keywords.length > 0)
    .map((g: SkillSection) => `
      <div class="skills-row">
        <span class="skill-cat">${escapeHtml(g.name || 'Skills')}:</span>
        ${g.keywords!.map((k: string) => escapeHtml(k)).join(', ')}
      </div>`)
    .join('');

  // Append languages as a skills row if present
  const langRowHtml = languageEntries.length > 0
    ? `<div class="skills-row"><span class="skill-cat">${escapeHtml(labels.languages)}:</span> ${languageEntries.map((l: string) => escapeHtml(l)).join(', ')}</div>`
    : '';

  const allSkillsHtml = skillRowsHtml + langRowHtml;

  // ── Projects ─────────────────────────────────────────────────────────────
  const projectsHtml = projects.slice(0, 6).map((proj: ProjectItem) => {
    const linkHtml = proj.url
      ? ` <span class="project-link">${escapeHtml(proj.url)}</span>`
      : '';
    return `
      <div class="project-entry">
        <span class="project-name">${escapeHtml(proj.name || '')}</span>${linkHtml}
        ${proj.description ? `<div class="project-desc">${escapeHtml(truncateText(proj.description, 160))}</div>` : ''}
      </div>`;
  }).join('');

  // ── Certifications ────────────────────────────────────────────────────────
  const certRowsHtml = certificates.slice(0, 6).map((cert: CertificateItem) => {
    const parts = [cert.name || cert.title, cert.issuer].filter(Boolean).map(s => escapeHtml(s!));
    return `<div class="skills-row">${parts.join('<span class="contact-sep">·</span>')}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(basics.name || '')} — ${escapeHtml(companyName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>${RESUME_CSS}</style>
</head>
<body>
<div class="resume">

  <header class="resume-header">
    <h1 class="name">${escapeHtml(basics.name || '')}</h1>
    ${basics.label || jobTitle ? `<div class="headline">${escapeHtml(basics.label || jobTitle)}</div>` : ''}
    ${contactHtml ? `<div class="contact-line">${contactHtml}</div>` : ''}
  </header>

  ${basics.summary ? `
  <section class="section">
    <h2 class="section-heading">${escapeHtml(labels.professionalSummary)}</h2>
    <p class="entry-summary">${escapeHtml(basics.summary)}</p>
  </section>` : ''}

  ${workHtml ? `
  <section class="section">
    <h2 class="section-heading">${escapeHtml(labels.experience)}</h2>
    ${workHtml}
  </section>` : ''}

  ${educationHtml ? `
  <section class="section">
    <h2 class="section-heading">${escapeHtml(labels.education)}</h2>
    ${educationHtml}
  </section>` : ''}

  ${allSkillsHtml ? `
  <section class="section">
    <h2 class="section-heading">${escapeHtml(labels.skills)}</h2>
    ${allSkillsHtml}
  </section>` : ''}

  ${projectsHtml ? `
  <section class="section">
    <h2 class="section-heading">${escapeHtml(labels.projects)}</h2>
    ${projectsHtml}
  </section>` : ''}

  ${certRowsHtml ? `
  <section class="section">
    <h2 class="section-heading">${escapeHtml(labels.certifications)}</h2>
    ${certRowsHtml}
  </section>` : ''}

</div>
</body>
</html>`;
}

/**
 * Format date range
 */
function formatDateRange(startDate?: string, endDate?: string): string {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  if (start === 'Present' && end === 'Present') return 'Present';
  if (start === end) return start;
  return `${start} – ${end}`;
}

/**
 * Truncate text to max length
 */
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name: string): string {
  // Remove special characters and clean spaces
  const cleaned = name.replace(/[^a-zA-Z0-9 \-_]/g, '').trim();
  // Replace multiple spaces with single underscore
  return cleaned.replace(/\s+/g, '_');
}

/**
 * Escape HTML
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format date
 */
function formatDate(date: string | undefined): string {
  if (!date) return 'Present';
  if (date.toLowerCase() === 'present' || date.toLowerCase() === 'current') {
    return 'Present';
  }
  return date;
}

/**
 * Validate YAML configuration
 */
export function validateYamlConfig(yamlContent: string): boolean {
  try {
    yaml.load(yamlContent);
    return true;
  } catch (error) {
    log.error(`Invalid YAML configuration: ${error}`);
    return false;
  }
}

/**
 * Clean up old resume files
 */
export function cleanupOldResumes(outputDir?: string, maxFiles: number = 50): void {
  try {
    const outputPath = outputDir || getTailoredResumesPath();

    if (!fs.existsSync(outputPath)) {
      return;
    }

    // Get all PDF and YAML files
    const files = fs.readdirSync(outputPath)
      .filter(f => f.endsWith('.pdf') || f.endsWith('.yaml'))
      .map(f => ({
        name: f,
        path: path.join(outputPath, f),
        mtime: fs.statSync(path.join(outputPath, f)).mtime.getTime(),
      }))
      .sort((a, b) => a.mtime - b.mtime); // oldest first

    if (files.length <= maxFiles) {
      return;
    }

    // Delete oldest files
    const filesToDelete = files.slice(0, files.length - maxFiles);
    for (const file of filesToDelete) {
      try {
        fs.unlinkSync(file.path);
        log.debug(`Deleted old resume file: ${file.path}`);
      } catch (error) {
        log.warn(`Failed to delete ${file.path}: ${error}`);
      }
    }

    log.info(`Cleaned up ${filesToDelete.length} old resume files`);
  } catch (error) {
    log.warn(`Error during resume cleanup: ${error}`);
  }
}
