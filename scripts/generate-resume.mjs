#!/usr/bin/env node
/**
 * CLI Script to generate a PDF resume from resume.yaml
 * 
 * This proves the Node.js bot generates PDFs without any Python dependency.
 * 
 * Usage:
 *   node scripts/generate-resume.mjs [resume.yaml] [output.pdf]
 * 
 * Examples:
 *   node scripts/generate-resume.mjs
 *   node scripts/generate-resume.mjs ./my-resume.yaml
 *   node scripts/generate-resume.mjs ./my-resume.yaml ./output/my-resume.pdf
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  if (dateStr.toLowerCase() === 'present') return 'Present';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

/**
 * Get icon for social network
 */
function getNetworkIcon(network) {
  const icons = {
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
 * Generate HTML resume from YAML config - Enterprise-grade two-column design
 * Professional layout with sidebar for contact/skills and main content for experience
 */
function generateResumeHtml(config) {
  const basics = config.basics || config.personal_information || {};
  const work = config.work || config.experience_details || [];
  const education = config.education || config.education_details || [];
  const projects = config.projects || [];
  const skills = config.skills || [];
  const certificates = config.certificates || [];
  const languages = skills.find(s => s.name === 'Languages')?.keywords || [];
  const technicalSkills = skills.filter(s => s.name !== 'Languages');

  // Build contact items for sidebar
  const contactItems = [
    basics.email && { icon: '✉', text: basics.email, href: `mailto:${basics.email}` },
    basics.phone && { icon: '📱', text: basics.phone },
    basics.location?.city && { icon: '📍', text: basics.location.city },
  ].filter(Boolean);

  // Build profile links
  const profileLinks = (basics.profiles || []).map(p => ({
    network: p.network,
    url: p.url,
    icon: getNetworkIcon(p.network),
  }));

  // Build skills HTML for sidebar
  const skillsHtml = technicalSkills.map(skillGroup => {
    const keywords = skillGroup.keywords || [];
    if (keywords.length === 0) return '';
    return `
      <div class="skill-category">
        <div class="skill-title">${escapeHtml(skillGroup.name || 'Technical Skills')}</div>
        <div class="skill-tags">
          ${keywords.slice(0, 12).map(k => `<span class="skill-tag">${escapeHtml(k)}</span>`).join('')}
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
        ${languages.map(lang => `<div class="language-item">${escapeHtml(lang)}</div>`).join('')}
      </div>
    </div>
  ` : '';

  // Build work experience HTML
  const workHtml = work.map((job, index) => `
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
          ${job.highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `).join('');

  // Build education HTML
  const educationHtml = education.map((edu, index) => `
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

  // Build projects HTML
  const projectsHtml = projects.slice(0, 6).map((proj, index) => `
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
        ${certificates.slice(0, 4).map(cert => `
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
  <title>Resume - ${escapeHtml(basics.name || '')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* ========================================
       CSS Variables - Design System
       ======================================== */
    :root {
      /* Colors */
      --color-primary: #1a365d;
      --color-primary-light: #2c5282;
      --color-accent: #3182ce;
      --color-text: #1a202c;
      --color-text-muted: #4a5568;
      --color-text-light: #718096;
      --color-border: #e2e8f0;
      --color-bg-sidebar: #f7fafc;
      --color-bg-white: #ffffff;
      --color-tag-bg: #edf2f7;
      
      /* Typography */
      --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-size-xs: 8pt;
      --font-size-sm: 9pt;
      --font-size-base: 10pt;
      --font-size-md: 11pt;
      --font-size-lg: 13pt;
      --font-size-xl: 18pt;
      --font-size-2xl: 22pt;
      
      /* Spacing */
      --space-xs: 0.15rem;
      --space-sm: 0.3rem;
      --space-md: 0.5rem;
      --space-lg: 0.75rem;
      --space-xl: 1rem;
      --space-2xl: 1.25rem;
      
      /* Layout */
      --sidebar-width: 2.4in;
      --border-radius: 3px;
    }

    /* ========================================
       Base Styles
       ======================================== */
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    html, body {
      font-family: var(--font-family);
      font-size: var(--font-size-base);
      line-height: 1.45;
      color: var(--color-text);
      background: var(--color-bg-white);
      -webkit-font-smoothing: antialiased;
    }

    /* ========================================
       Two-Column Layout
       ======================================== */
    .resume-container {
      display: flex;
      min-height: 100vh;
      max-width: 8.5in;
      margin: 0 auto;
    }

    /* ========================================
       Sidebar (Left Column)
       ======================================== */
    .sidebar {
      width: var(--sidebar-width);
      background: var(--color-bg-sidebar);
      padding: var(--space-xl);
      border-right: 1px solid var(--color-border);
      flex-shrink: 0;
    }

    .sidebar-section {
      margin-bottom: var(--space-xl);
    }

    .sidebar-section:last-child {
      margin-bottom: 0;
    }

    .sidebar-heading {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: var(--space-md);
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .heading-icon {
      font-size: var(--font-size-base);
    }

    /* Contact Info */
    .contact-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .contact-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-sm);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }

    .contact-item a {
      color: var(--color-text-muted);
      text-decoration: none;
      word-break: break-all;
    }

    .contact-item a:hover {
      color: var(--color-accent);
    }

    .contact-icon {
      flex-shrink: 0;
      width: 14px;
      text-align: center;
    }

    /* Profile Links */
    .profile-links {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .profile-link {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: var(--font-size-sm);
      color: var(--color-accent);
      text-decoration: none;
    }

    .profile-link:hover {
      text-decoration: underline;
    }

    /* Skills */
    .skill-category {
      margin-bottom: var(--space-md);
    }

    .skill-category:last-child {
      margin-bottom: 0;
    }

    .skill-title {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-text-muted);
      margin-bottom: var(--space-xs);
    }

    .skill-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
    }

    .skill-tag {
      display: inline-block;
      padding: 2px 6px;
      background: var(--color-tag-bg);
      border-radius: var(--border-radius);
      font-size: var(--font-size-xs);
      color: var(--color-text);
      white-space: nowrap;
    }

    /* Languages */
    .languages-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .language-item {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }

    /* Certifications */
    .certifications-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .certification-item {
      padding-left: var(--space-sm);
      border-left: 2px solid var(--color-accent);
    }

    .cert-name {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--color-text);
    }

    .cert-issuer {
      font-size: var(--font-size-xs);
      color: var(--color-text-light);
    }

    /* ========================================
       Main Content (Right Column)
       ======================================== */
    .main-content {
      flex: 1;
      padding: var(--space-xl);
      padding-left: var(--space-2xl);
    }

    /* Header */
    .header {
      margin-bottom: var(--space-xl);
      padding-bottom: var(--space-lg);
      border-bottom: 2px solid var(--color-primary);
    }

    .name {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      color: var(--color-primary);
      letter-spacing: -0.02em;
      margin-bottom: var(--space-xs);
    }

    .headline {
      font-size: var(--font-size-md);
      color: var(--color-text-muted);
      font-weight: 400;
    }

    /* Sections */
    .section {
      margin-bottom: var(--space-xl);
    }

    .section:last-child {
      margin-bottom: 0;
    }

    .section-heading {
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--color-primary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: var(--space-md);
      padding-bottom: var(--space-xs);
      border-bottom: 1px solid var(--color-border);
    }

    /* Experience Items */
    .experience-item, .education-item {
      margin-bottom: var(--space-md);
    }

    .mt-item {
      margin-top: var(--space-lg);
      padding-top: var(--space-md);
      border-top: 1px solid var(--color-border);
    }

    .mt-item-sm {
      margin-top: var(--space-sm);
    }

    .experience-header, .education-header {
      margin-bottom: var(--space-xs);
    }

    .experience-title-row, .education-title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--space-md);
    }

    .experience-title, .education-title {
      font-size: var(--font-size-base);
      font-weight: 600;
      color: var(--color-text);
    }

    .experience-date, .education-date {
      font-size: var(--font-size-xs);
      color: var(--color-text-light);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .experience-company, .education-institution {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--color-accent);
    }

    .experience-summary {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      margin-top: var(--space-xs);
    }

    .experience-highlights {
      margin-top: var(--space-xs);
      margin-left: var(--space-lg);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }

    .experience-highlights li {
      margin-bottom: 2px;
    }

    .education-score {
      font-size: var(--font-size-xs);
      color: var(--color-text-light);
      margin-top: var(--space-xs);
    }

    /* Projects */
    .project-item {
      padding: var(--space-sm);
      background: var(--color-bg-sidebar);
      border-radius: var(--border-radius);
      border-left: 3px solid var(--color-accent);
    }

    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-xs);
    }

    .project-title {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text);
    }

    .project-link {
      font-size: var(--font-size-sm);
      color: var(--color-accent);
      text-decoration: none;
    }

    .project-description {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      line-height: 1.4;
    }

    /* ========================================
       Print Optimization
       ======================================== */
    @media print {
      .resume-container {
        min-height: auto;
      }
      
      .sidebar {
        background: var(--color-bg-sidebar) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .skill-tag {
        background: var(--color-tag-bg) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .project-item {
        background: var(--color-bg-sidebar) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
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
          ${contactItems.map(item => `
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
            ${profileLinks.map(link => `
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
        ${basics.label || basics.description ? `<div class="headline">${escapeHtml(basics.label || basics.description)}</div>` : ''}
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
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const resumePath = args[0] || DEFAULT_RESUME_PATH;
  const outputPath = args[1] || path.join(DEFAULT_OUTPUT_DIR, `resume_${Date.now()}.pdf`);
  
  console.log('📄 Node.js Resume Generator (Cross-Platform)');
  console.log('=============================================');
  console.log();
  console.log('📍 Platform paths:');
  console.log(`   userData:  ${USER_DATA}`);
  console.log(`   Input:     ${resumePath}`);
  console.log(`   Output:    ${outputPath}`);
  console.log();
  
  // Check if resume file exists
  if (!fs.existsSync(resumePath)) {
    console.error(`❌ Resume file not found: ${resumePath}`);
    console.log();
    console.log('📋 To use this tool:');
    console.log('   1. Create your resume.yaml file');
    console.log(`   2. Save it to: ${DEFAULT_RESUME_PATH}`);
    console.log('   3. Run this script again');
    console.log();
    console.log('📍 Expected file locations by platform:');
    console.log('   Linux:   ~/.config/jobelix/data/resume.yaml');
    console.log('   macOS:   ~/Library/Application Support/jobelix/data/resume.yaml');
    console.log('   Windows: %APPDATA%\\jobelix\\data\\resume.yaml');
    console.log();
    console.log('💡 Or specify a custom path:');
    console.log('   node scripts/generate-resume.mjs /path/to/resume.yaml [output.pdf]');
    process.exit(1);
  }
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Load resume YAML
  console.log('📖 Loading resume.yaml...');
  const resumeContent = fs.readFileSync(resumePath, 'utf-8');
  const config = yaml.load(resumeContent);
  
  // Generate HTML
  console.log('🔨 Generating HTML...');
  const html = generateResumeHtml(config);
  
  // Save HTML for debugging
  const htmlPath = outputPath.replace('.pdf', '.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`📝 HTML saved: ${htmlPath}`);
  
  // Launch Playwright and generate PDF
  console.log('🚀 Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('📄 Rendering to PDF...');
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
  
  // Verify output
  const stats = fs.statSync(outputPath);
  console.log();
  console.log('✅ PDF generated successfully!');
  console.log(`   File: ${outputPath}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log();
  console.log('🎉 This proves Node.js resume generation works without Python!');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
