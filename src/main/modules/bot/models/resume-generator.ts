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

const log = createLogger('ResumeGenerator');

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
  const { companyName, jobTitle, tailoredConfigYaml, outputDir, scoresJson, page } = options;

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
    
    if (page) {
      // Use provided Playwright page
      await generatePdfWithPlaywright(tailoredConfigYaml, pdfPath, page, companyName, jobTitle);
    } else {
      // Fallback to HTML-based generation without browser
      await generatePdfWithHtml(tailoredConfigYaml, pdfPath, companyName, jobTitle);
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
  jobTitle: string
): Promise<void> {
  const config = yaml.load(yamlContent) as any;
  const html = generateResumeHtml(config, companyName, jobTitle);

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
  jobTitle: string
): Promise<void> {
  const config = yaml.load(yamlContent) as any;
  const html = generateResumeHtml(config, companyName, jobTitle);

  // Save HTML temporarily (for debugging or external PDF generation)
  const htmlPath = outputPath.replace('.pdf', '.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');
  
  log.warn('No browser page provided - HTML saved to: ' + htmlPath);
  log.warn('PDF generation requires a browser. Please provide a Playwright page or use external PDF converter.');
  
  throw new Error('PDF generation requires a browser page. Provide options.page parameter.');
}

/**
 * Generate HTML resume from config
 * 
 * Enterprise-grade two-column layout with:
 * - Professional typography with Inter font
 * - Clear visual hierarchy
 * - Consistent spacing system
 * - ATS-friendly structure
 */
function generateResumeHtml(config: any, companyName: string, jobTitle: string): string {
  const basics = config.basics || config.personal_information || {};
  const work = config.work || config.experience_details || [];
  const education = config.education || config.education_details || [];
  const projects = config.projects || [];
  const skills = config.skills || [];
  const certificates = config.certificates || [];
  const languages = skills.find((s: any) => s.name === 'Languages')?.keywords || [];
  const technicalSkills = skills.filter((s: any) => s.name !== 'Languages');

  // Build contact items for sidebar
  const contactItems = [
    basics.email && { icon: '✉', text: basics.email, href: `mailto:${basics.email}` },
    basics.phone && { icon: '📱', text: basics.phone },
    basics.location?.city && { icon: '📍', text: basics.location.city },
  ].filter(Boolean);

  // Build profile links
  const profileLinks = (basics.profiles || []).map((p: any) => ({
    network: p.network,
    url: p.url,
    icon: getNetworkIcon(p.network),
  }));

  // Build skills HTML for sidebar
  const skillsHtml = technicalSkills.map((skillGroup: any) => {
    const keywords = skillGroup.keywords || [];
    if (keywords.length === 0) return '';
    return `
      <div class="skill-category">
        <div class="skill-title">${escapeHtml(skillGroup.name || 'Technical Skills')}</div>
        <div class="skill-tags">
          ${keywords.slice(0, 12).map((k: string) => `<span class="skill-tag">${escapeHtml(k)}</span>`).join('')}
        </div>
      </div>
    `;
  }).filter(Boolean).join('');

  // Build languages HTML
  const languagesHtml = languages.length > 0 ? `
    <div class="sidebar-section">
      <h3 class="sidebar-heading">
        <span class="heading-icon">🌐</span>
        Languages
      </h3>
      <div class="languages-list">
        ${languages.map((lang: string) => `<div class="language-item">${escapeHtml(lang)}</div>`).join('')}
      </div>
    </div>
  ` : '';

  // Build work experience HTML
  const workHtml = work.map((job: any, index: number) => `
    <div class="experience-item${index > 0 ? ' mt-item' : ''}">
      <div class="experience-header">
        <div class="experience-title-row">
          <h3 class="experience-title">${escapeHtml(job.position || job.title || '')}</h3>
          <span class="experience-date">${formatDateRange(job.startDate, job.endDate)}</span>
        </div>
        <div class="experience-company">${escapeHtml(job.company || job.name || '')}</div>
      </div>
      ${job.summary || job.description ? `<p class="experience-summary">${escapeHtml(job.summary || job.description)}</p>` : ''}
      ${job.highlights && job.highlights.length > 0 ? `
        <ul class="experience-highlights">
          ${job.highlights.map((h: string) => `<li>${escapeHtml(h)}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `).join('');

  // Build education HTML
  const educationHtml = education.map((edu: any, index: number) => `
    <div class="education-item${index > 0 ? ' mt-item' : ''}">
      <div class="education-header">
        <div class="education-title-row">
          <h3 class="education-title">${escapeHtml(edu.area || edu.studyType || '')}</h3>
          <span class="education-date">${formatDateRange(edu.startDate, edu.endDate)}</span>
        </div>
        <div class="education-institution">${escapeHtml(edu.institution || '')}</div>
      </div>
      ${edu.score ? `<div class="education-score">GPA: ${escapeHtml(edu.score)}</div>` : ''}
    </div>
  `).join('');

  // Build projects HTML (compact, 2 per row visual feel)
  const projectsHtml = projects.slice(0, 6).map((proj: any, index: number) => `
    <div class="project-item${index > 0 ? ' mt-item-sm' : ''}">
      <div class="project-header">
        <h3 class="project-title">${escapeHtml(proj.name || '')}</h3>
        ${proj.url ? `<a href="${escapeHtml(proj.url)}" class="project-link">↗</a>` : ''}
      </div>
      <p class="project-description">${escapeHtml(truncateText(proj.description || '', 150))}</p>
    </div>
  `).join('');

  // Build certifications HTML
  const certificationsHtml = certificates.length > 0 ? `
    <div class="sidebar-section">
      <h3 class="sidebar-heading">
        <span class="heading-icon">🏆</span>
        Certifications
      </h3>
      <div class="certifications-list">
        ${certificates.slice(0, 4).map((cert: any) => `
          <div class="certification-item">
            <div class="cert-name">${escapeHtml(cert.name || cert.title || '')}</div>
            ${cert.issuer ? `<div class="cert-issuer">${escapeHtml(cert.issuer)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume - ${escapeHtml(basics.name || '')} - ${escapeHtml(companyName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>${RESUME_CSS}</style>
</head>
<body>
  <div class="resume-container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <!-- Contact -->
      <div class="sidebar-section">
        <h3 class="sidebar-heading">
          <span class="heading-icon">📧</span>
          Contact
        </h3>
        <div class="contact-list">
          ${contactItems.map((item: any) => `
            <div class="contact-item">
              <span class="contact-icon">${item.icon}</span>
              ${item.href ? `<a href="${escapeHtml(item.href)}">${escapeHtml(item.text)}</a>` : `<span>${escapeHtml(item.text)}</span>`}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Profile Links -->
      ${profileLinks.length > 0 ? `
        <div class="sidebar-section">
          <h3 class="sidebar-heading">
            <span class="heading-icon">🔗</span>
            Profiles
          </h3>
          <div class="profile-links">
            ${profileLinks.map((link: any) => `
              <a href="${escapeHtml(link.url)}" class="profile-link">
                <span>${link.icon}</span>
                <span>${escapeHtml(link.network)}</span>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Skills -->
      ${skillsHtml ? `
        <div class="sidebar-section">
          <h3 class="sidebar-heading">
            <span class="heading-icon">⚡</span>
            Skills
          </h3>
          ${skillsHtml}
        </div>
      ` : ''}

      <!-- Languages -->
      ${languagesHtml}

      <!-- Certifications -->
      ${certificationsHtml}
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Header -->
      <header class="header">
        <h1 class="name">${escapeHtml(basics.name || '')}</h1>
        ${basics.label || jobTitle ? `<div class="headline">${escapeHtml(basics.label || jobTitle)}</div>` : ''}
      </header>

      <!-- Summary -->
      ${basics.summary ? `
        <section class="section">
          <h2 class="section-heading">Professional Summary</h2>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${escapeHtml(basics.summary)}</p>
        </section>
      ` : ''}

      <!-- Experience -->
      ${workHtml ? `
        <section class="section">
          <h2 class="section-heading">Experience</h2>
          ${workHtml}
        </section>
      ` : ''}

      <!-- Education -->
      ${educationHtml ? `
        <section class="section">
          <h2 class="section-heading">Education</h2>
          ${educationHtml}
        </section>
      ` : ''}

      <!-- Projects -->
      ${projectsHtml ? `
        <section class="section">
          <h2 class="section-heading">Projects</h2>
          ${projectsHtml}
        </section>
      ` : ''}
    </main>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Get icon for social network
 */
function getNetworkIcon(network: string): string {
  const icons: Record<string, string> = {
    'LinkedIn': '💼',
    'GitHub': '🐙',
    'Twitter': '🐦',
    'Portfolio': '🌐',
    'Website': '🌐',
    'Kaggle': '📊',
    'StackOverflow': '📚',
  };
  return icons[network] || '🔗';
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
