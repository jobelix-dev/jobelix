#!/usr/bin/env node
/**
 * CLI Script to generate a PDF resume from resume.yaml
 *
 * Uses the same single-column ATS-friendly design as the bot's resume generator.
 *
 * Usage:
 *   node scripts/generate-resume.mjs [resume.yaml] [output.pdf]
 *
 * Examples:
 *   node scripts/generate-resume.mjs
 *   node scripts/generate-resume.mjs ./my-resume.yaml
 *   node scripts/generate-resume.mjs ./my-resume.yaml ./output/my-resume.pdf
 */

import { chromium } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(__filename);

/**
 * Get userData path (same as Electron's app.getPath('userData'))
 */
function getUserDataPath() {
  const appName = 'jobelix';
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', appName);
  } else if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appName);
  } else {
    return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), appName);
  }
}

// Default paths (using userData)
const USER_DATA = getUserDataPath();
const DEFAULT_RESUME_PATH = path.join(USER_DATA, 'data', 'resume.yaml');
const DEFAULT_OUTPUT_DIR = path.join(USER_DATA, 'tailored_resumes');

/**
 * Resume CSS — single-column, ATS-friendly layout
 * Mirrors src/main/modules/bot/models/resume-styles.ts
 */
const RESUME_CSS = `
  /* ── Reset ── */
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  /* ── Base ── */
  html, body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 9.5pt;
    line-height: 1.45;
    color: #374151;
    background: #fff;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Page wrapper ── */
  .resume {
    max-width: 7.5in;   /* fits inside 0.5in margins on A4/Letter */
    margin: 0 auto;
  }

  /* ── Header ── */
  .resume-header {
    margin-bottom: 10pt;
    padding-bottom: 7pt;
    border-bottom: 1.5pt solid #111827;
  }

  .name {
    font-size: 21pt;
    font-weight: 700;
    color: #111827;
    letter-spacing: -0.01em;
    line-height: 1.15;
    margin-bottom: 3pt;
  }

  .headline {
    font-size: 10pt;
    font-weight: 400;
    color: #6b7280;
    margin-bottom: 4pt;
  }

  .contact-line {
    font-size: 8.5pt;
    color: #6b7280;
    line-height: 1.6;
  }

  .contact-line a {
    color: #6b7280;
    text-decoration: none;
  }

  .contact-sep {
    margin: 0 4pt;
    color: #d1d5db;
  }

  /* ── Sections ── */
  .section {
    margin-top: 9pt;
  }

  .section-heading {
    font-size: 8pt;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    padding-bottom: 2.5pt;
    border-bottom: 0.75pt solid #d1d5db;
    margin-bottom: 6pt;
  }

  /* ── Experience / Education entries ── */
  .entry {
    margin-bottom: 7pt;
  }

  .entry:last-child {
    margin-bottom: 0;
  }

  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8pt;
    margin-bottom: 1pt;
  }

  .entry-left {
    flex: 1;
    min-width: 0;
  }

  .entry-title {
    font-size: 9.5pt;
    font-weight: 600;
    color: #111827;
  }

  .entry-title-sep {
    margin: 0 4pt;
    color: #d1d5db;
    font-weight: 400;
  }

  .entry-org {
    font-size: 9.5pt;
    font-weight: 400;
    color: #374151;
  }

  .entry-meta {
    font-size: 8.5pt;
    color: #6b7280;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .entry-summary {
    font-size: 9pt;
    color: #4b5563;
    margin-top: 2pt;
    margin-bottom: 2pt;
  }

  .bullets {
    margin-top: 2.5pt;
    margin-left: 12pt;
    font-size: 9pt;
    color: #4b5563;
  }

  .bullets li {
    margin-bottom: 1.5pt;
    line-height: 1.45;
  }

  /* ── Skills ── */
  .skills-row {
    font-size: 9pt;
    color: #374151;
    margin-bottom: 3pt;
    line-height: 1.5;
  }

  .skills-row:last-child {
    margin-bottom: 0;
  }

  .skill-cat {
    font-weight: 600;
    color: #111827;
  }

  /* ── Projects ── */
  .project-entry {
    margin-bottom: 5pt;
  }

  .project-entry:last-child {
    margin-bottom: 0;
  }

  .project-name {
    font-size: 9.5pt;
    font-weight: 600;
    color: #111827;
  }

  .project-link {
    font-size: 8.5pt;
    color: #6b7280;
    margin-left: 5pt;
    font-weight: 400;
  }

  .project-desc {
    font-size: 9pt;
    color: #4b5563;
    margin-top: 1.5pt;
    line-height: 1.45;
  }

  /* ── Print ── */
  @media print {
    html, body { background: #fff !important; }
  }
`;

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format a date string
 */
function formatDate(dateStr) {
  if (!dateStr) return 'Present';
  if (dateStr.toLowerCase() === 'present' || dateStr.toLowerCase() === 'current') return 'Present';
  return dateStr;
}

/**
 * Format date range
 */
function formatDateRange(startDate, endDate) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  if (start === 'Present' && end === 'Present') return 'Present';
  if (start === end) return start;
  return `${start} – ${end}`;
}

/**
 * Truncate text to max length
 */
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Generate HTML resume from YAML config — single-column, ATS-friendly design.
 * Mirrors the logic in src/main/modules/bot/models/resume-generator.ts
 */
function generateResumeHtml(config) {
  const basics = config.basics || config.personal_information || {};
  const work = config.work || config.experience_details || [];
  const education = config.education || config.education_details || [];
  const projects = config.projects || [];
  const skills = config.skills || [];
  const certificates = config.certificates || [];

  // Separate language entries from technical skill groups
  const languageGroup = skills.find(s => s.name === 'Languages');
  const languageEntries = languageGroup?.keywords || [];
  const technicalSkills = skills.filter(s => s.name !== 'Languages');

  // ── Contact line ────────────────────────────────────────────────────────
  const contactParts = [];
  if (basics.email) contactParts.push(`<a href="mailto:${escapeHtml(basics.email)}">${escapeHtml(basics.email)}</a>`);
  if (basics.phone) contactParts.push(escapeHtml(basics.phone));
  if (basics.location?.city) contactParts.push(escapeHtml(basics.location.city));
  for (const p of (basics.profiles || [])) {
    contactParts.push(`<a href="${escapeHtml(p.url)}">${escapeHtml(p.network)}</a>`);
  }
  const contactHtml = contactParts.join('<span class="contact-sep">·</span>');

  // ── Experience ──────────────────────────────────────────────────────────
  const workHtml = work.map(job => {
    const title = escapeHtml(job.position || job.title || '');
    const org = escapeHtml(job.company || job.name || '');
    const location = job.location ? escapeHtml(job.location) : '';
    const metaParts = [location, formatDateRange(job.startDate, job.endDate)].filter(Boolean);
    const summary = job.summary || job.description || '';
    const highlightsHtml = job.highlights && job.highlights.length > 0
      ? `<ul class="bullets">${job.highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')}</ul>`
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

  // ── Education ───────────────────────────────────────────────────────────
  const educationHtml = education.map(edu => {
    const degree = [edu.studyType, edu.area].filter(Boolean).map(escapeHtml).join(', ');
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

  // ── Skills ──────────────────────────────────────────────────────────────
  const skillRowsHtml = technicalSkills
    .filter(g => g.keywords && g.keywords.length > 0)
    .map(g => `
      <div class="skills-row">
        <span class="skill-cat">${escapeHtml(g.name || 'Skills')}:</span>
        ${g.keywords.map(k => escapeHtml(k)).join(', ')}
      </div>`)
    .join('');

  const langRowHtml = languageEntries.length > 0
    ? `<div class="skills-row"><span class="skill-cat">Languages:</span> ${languageEntries.map(l => escapeHtml(l)).join(', ')}</div>`
    : '';

  const allSkillsHtml = skillRowsHtml + langRowHtml;

  // ── Projects ─────────────────────────────────────────────────────────────
  const projectsHtml = projects.slice(0, 6).map(proj => {
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
  const certRowsHtml = certificates.slice(0, 6).map(cert => {
    const parts = [cert.name || cert.title, cert.issuer].filter(Boolean).map(s => escapeHtml(s));
    return `<div class="skills-row">${parts.join('<span class="contact-sep">·</span>')}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(basics.name || '')} — Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>${RESUME_CSS}</style>
</head>
<body>
<div class="resume">

  <header class="resume-header">
    <h1 class="name">${escapeHtml(basics.name || '')}</h1>
    ${basics.label || basics.description ? `<div class="headline">${escapeHtml(basics.label || basics.description)}</div>` : ''}
    ${contactHtml ? `<div class="contact-line">${contactHtml}</div>` : ''}
  </header>

  ${basics.summary ? `
  <section class="section">
    <h2 class="section-heading">Professional Summary</h2>
    <p class="entry-summary">${escapeHtml(basics.summary)}</p>
  </section>` : ''}

  ${workHtml ? `
  <section class="section">
    <h2 class="section-heading">Experience</h2>
    ${workHtml}
  </section>` : ''}

  ${educationHtml ? `
  <section class="section">
    <h2 class="section-heading">Education</h2>
    ${educationHtml}
  </section>` : ''}

  ${allSkillsHtml ? `
  <section class="section">
    <h2 class="section-heading">Skills</h2>
    ${allSkillsHtml}
  </section>` : ''}

  ${projectsHtml ? `
  <section class="section">
    <h2 class="section-heading">Projects</h2>
    ${projectsHtml}
  </section>` : ''}

  ${certRowsHtml ? `
  <section class="section">
    <h2 class="section-heading">Certifications</h2>
    ${certRowsHtml}
  </section>` : ''}

</div>
</body>
</html>`;
}

/**
 * Find and launch a Chromium-based browser across platforms.
 * Tries playwright channels first (Chrome, Edge, Chromium), then common system paths.
 */
async function findAndLaunchBrowser() {
  // playwright-core channel resolution knows where browsers live on each OS
  for (const channel of ['chrome', 'msedge', 'chromium']) {
    try {
      return await chromium.launch({ headless: true, channel });
    } catch {
      // not installed, try next
    }
  }

  // Fallback: common system paths (mainly Linux)
  const systemPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
  for (const executablePath of systemPaths) {
    if (fs.existsSync(executablePath)) {
      return await chromium.launch({ headless: true, executablePath });
    }
  }

  throw new Error(
    'No Chromium-based browser found.\n' +
    'Install Google Chrome, Microsoft Edge, or Chromium and try again.'
  );
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const resumePath = args[0] || DEFAULT_RESUME_PATH;
  const outputPath = args[1] || path.join(DEFAULT_OUTPUT_DIR, `resume_${Date.now()}.pdf`);

  console.log('Resume Generator');
  console.log('================');
  console.log();
  console.log(`Input:  ${resumePath}`);
  console.log(`Output: ${outputPath}`);
  console.log();

  // Check if resume file exists
  if (!fs.existsSync(resumePath)) {
    console.error(`Error: Resume file not found: ${resumePath}`);
    console.log();
    console.log('Usage: node scripts/generate-resume.mjs [resume.yaml] [output.pdf]');
    console.log();
    console.log('Default resume location by platform:');
    console.log('  Linux:   ~/.config/jobelix/data/resume.yaml');
    console.log('  macOS:   ~/Library/Application Support/jobelix/data/resume.yaml');
    console.log('  Windows: %APPDATA%\\jobelix\\data\\resume.yaml');
    process.exit(1);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Load resume YAML
  console.log('Loading resume.yaml...');
  const resumeContent = fs.readFileSync(resumePath, 'utf-8');
  const config = yaml.load(resumeContent);

  // Generate HTML
  console.log('Generating HTML...');
  const html = generateResumeHtml(config);

  // Save HTML for inspection
  const htmlPath = outputPath.replace('.pdf', '.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`HTML saved: ${htmlPath}`);

  // Launch Playwright and generate PDF
  console.log('Launching browser...');
  const browser = await findAndLaunchBrowser();
  const page = await browser.newPage();

  console.log('Rendering to PDF...');
  await page.setContent(html, { waitUntil: 'networkidle' });
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

  await browser.close();

  const stats = fs.statSync(outputPath);
  console.log();
  console.log(`PDF generated: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
