/**
 * Resume Generation Utilities
 * 
 * Generates custom PDF resumes for each job application using Puppeteer.
 * Port of Python's src/resume/generator.py
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { Page } from 'playwright';
import { createLogger } from '../utils/logger';
import { getTailoredResumesPath } from '../utils/paths';

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

  // Set HTML content
  await page.setContent(html, { waitUntil: 'networkidle' });

  // Generate PDF
  await page.pdf({
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
 */
function generateResumeHtml(config: any, companyName: string, jobTitle: string): string {
  const basics = config.basics || config.personal_information || {};
  const work = config.work || config.experience_details || [];
  const education = config.education || config.education_details || [];
  const projects = config.projects || [];
  const skills = config.skills || [];
  const certificates = config.certificates || [];

  // Build skills HTML
  const skillsHtml = skills.map((skillGroup: any) => {
    if (skillGroup.name === 'Languages') return ''; // Skip languages for now
    const keywords = skillGroup.keywords || [];
    return `
      <div class="skill-group">
        <h3>${escapeHtml(skillGroup.name || 'Skills')}</h3>
        <p>${keywords.map((k: string) => escapeHtml(k)).join(', ')}</p>
      </div>
    `;
  }).join('');

  // Build work experience HTML
  const workHtml = work.map((job: any) => `
    <div class="work-item">
      <h3>${escapeHtml(job.position || job.title || '')}</h3>
      <div class="company">${escapeHtml(job.company || job.name || '')}</div>
      <div class="date">${formatDate(job.startDate)} - ${formatDate(job.endDate)}</div>
      <p>${escapeHtml(job.summary || job.description || '')}</p>
      ${job.highlights ? `<ul>${job.highlights.map((h: string) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>` : ''}
    </div>
  `).join('');

  // Build education HTML
  const educationHtml = education.map((edu: any) => `
    <div class="education-item">
      <h3>${escapeHtml(edu.studyType || '')} ${escapeHtml(edu.area || '')}</h3>
      <div class="institution">${escapeHtml(edu.institution || '')}</div>
      <div class="date">${formatDate(edu.startDate)} - ${formatDate(edu.endDate)}</div>
      ${edu.score ? `<div class="score">GPA: ${escapeHtml(edu.score)}</div>` : ''}
    </div>
  `).join('');

  // Build projects HTML
  const projectsHtml = projects.map((proj: any) => `
    <div class="project-item">
      <h3>${escapeHtml(proj.name || '')}</h3>
      <p>${escapeHtml(proj.description || '')}</p>
      ${proj.highlights ? `<ul>${proj.highlights.map((h: string) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>` : ''}
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume - ${escapeHtml(basics.name || '')} - ${escapeHtml(companyName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #333;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in;
    }
    h1 { font-size: 24pt; margin-bottom: 0.2em; color: #2c3e50; }
    h2 { 
      font-size: 14pt; 
      margin-top: 1em; 
      margin-bottom: 0.5em; 
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 0.2em;
    }
    h3 { font-size: 12pt; margin-top: 0.5em; margin-bottom: 0.2em; color: #34495e; }
    .header { text-align: center; margin-bottom: 1em; }
    .contact { font-size: 10pt; color: #666; }
    .contact a { color: #3498db; text-decoration: none; }
    .section { margin-bottom: 1.5em; }
    .work-item, .education-item, .project-item { margin-bottom: 1em; }
    .company, .institution { font-weight: 600; color: #555; }
    .date { font-size: 10pt; color: #888; font-style: italic; }
    .score { font-size: 10pt; color: #666; }
    ul { margin-left: 1.5em; margin-top: 0.3em; }
    li { margin-bottom: 0.2em; }
    .skill-group { margin-bottom: 0.5em; }
    .skill-group h3 { font-size: 11pt; margin-bottom: 0.2em; }
    .skill-group p { color: #555; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(basics.name || '')}</h1>
    <div class="contact">
      ${basics.email ? `<a href="mailto:${basics.email}">${escapeHtml(basics.email)}</a>` : ''}
      ${basics.phone ? ` | ${escapeHtml(basics.phone)}` : ''}
      ${basics.location?.city ? ` | ${escapeHtml(basics.location.city)}` : ''}
      ${basics.profiles?.find((p: any) => p.network === 'LinkedIn') ? 
        ` | <a href="${basics.profiles.find((p: any) => p.network === 'LinkedIn').url}">LinkedIn</a>` : ''}
      ${basics.profiles?.find((p: any) => p.network === 'GitHub') ? 
        ` | <a href="${basics.profiles.find((p: any) => p.network === 'GitHub').url}">GitHub</a>` : ''}
    </div>
  </div>

  ${basics.summary ? `
    <div class="section">
      <h2>Summary</h2>
      <p>${escapeHtml(basics.summary)}</p>
    </div>
  ` : ''}

  ${skillsHtml ? `
    <div class="section">
      <h2>Skills</h2>
      ${skillsHtml}
    </div>
  ` : ''}

  ${workHtml ? `
    <div class="section">
      <h2>Experience</h2>
      ${workHtml}
    </div>
  ` : ''}

  ${projectsHtml ? `
    <div class="section">
      <h2>Projects</h2>
      ${projectsHtml}
    </div>
  ` : ''}

  ${educationHtml ? `
    <div class="section">
      <h2>Education</h2>
      ${educationHtml}
    </div>
  ` : ''}

  ${certificates && certificates.length > 0 ? `
    <div class="section">
      <h2>Certifications</h2>
      ${certificates.map((cert: any) => `
        <div class="cert-item">
          <strong>${escapeHtml(cert.name || cert.title || '')}</strong>
          ${cert.issuer ? ` - ${escapeHtml(cert.issuer)}` : ''}
          ${cert.date ? ` (${formatDate(cert.date)})` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''}
</body>
</html>
  `.trim();
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
