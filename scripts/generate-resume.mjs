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
 * Generate HTML resume from YAML config - Professional single-column design
 * Inspired by resumy's clean layout with grid-based sections
 */
function generateResumeHtml(config) {
  const basics = config.basics || config.personal_information || {};
  const work = config.work || config.experience_details || [];
  const education = config.education || config.education_details || [];
  const projects = config.projects || [];
  const skills = config.skills || [];
  const certificates = config.certificates || [];
  const hackathons = config.hackathons || [];

  // Build header contact items
  const contactItems = [];
  if (basics.phone) contactItems.push(`<span class="contact-item">${escapeHtml(basics.phone)}</span>`);
  if (basics.email) contactItems.push(`<span class="contact-item"><a href="mailto:${basics.email}">${escapeHtml(basics.email)}</a></span>`);
  
  // Add profile links
  const profiles = basics.profiles || [];
  const github = profiles.find(p => p.network?.toLowerCase() === 'github');
  const linkedin = profiles.find(p => p.network?.toLowerCase() === 'linkedin');
  if (github) contactItems.push(`<span class="contact-item"><a href="${github.url}">${escapeHtml(github.username || 'GitHub')}</a></span>`);
  if (linkedin) contactItems.push(`<span class="contact-item"><a href="${linkedin.url}">${escapeHtml(linkedin.username || 'LinkedIn')}</a></span>`);
  if (basics.location?.city) contactItems.push(`<span class="contact-item">${escapeHtml(basics.location.city)}${basics.location?.countryCode ? ` (${basics.location.countryCode})` : ''}</span>`);

  // Education section
  const educationHtml = education.map(edu => `
    <li>
      <div class="grid-row">
        <div class="grid-left">
          <span class="item-title">${escapeHtml(edu.area || '')}</span> – <span class="item-org">${escapeHtml(edu.institution || '')}</span>
        </div>
        <div class="grid-right">${formatDate(edu.startDate)}${edu.endDate ? ` – ${formatDate(edu.endDate)}` : ''}</div>
      </div>
    </li>
  `).join('');

  // Work experience section
  const workHtml = work.map(job => {
    const highlights = job.highlights || [];
    return `
      <li>
        <div class="grid-row">
          <div class="grid-left">
            <span class="item-title">${escapeHtml(job.position || job.title || '')}</span> – <span class="item-org">${escapeHtml(job.name || job.company || '')}</span>
          </div>
          <div class="grid-right">${formatDate(job.startDate)} – ${formatDate(job.endDate)}</div>
        </div>
        ${job.location ? `<div class="item-location">${escapeHtml(job.location)}</div>` : ''}
        ${highlights.length > 0 ? `<ul class="highlights">${highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')}</ul>` : ''}
      </li>
    `;
  }).join('');

  // Hackathons section
  const hackathonsHtml = hackathons.map(h => `
    <li>
      <div class="grid-row">
        <div class="grid-left">
          <span class="item-title"><a href="${h.url || '#'}">${escapeHtml(h.name || '')}</a></span>
        </div>
        <div class="grid-right">${escapeHtml(h.date || '')}</div>
      </div>
      <div class="item-desc">${escapeHtml(h.description || '')}</div>
    </li>
  `).join('');

  // Projects section
  const projectsHtml = projects.map(proj => `
    <li>
      <div class="grid-row">
        <div class="grid-left">
          <span class="item-title"><a href="${proj.url || '#'}">${escapeHtml(proj.name || '')}</a></span>
        </div>
        <div class="grid-right">${escapeHtml(proj.date || '')}</div>
      </div>
      <div class="item-desc">${escapeHtml(proj.description || '')}</div>
    </li>
  `).join('');

  // Skills section - key: value format
  const skillsHtml = skills.map(skillGroup => {
    const keywords = skillGroup.keywords || [];
    return `<li><span class="skill-name">${escapeHtml(skillGroup.name || '')}</span>: ${keywords.map(k => escapeHtml(k)).join(', ')}</li>`;
  }).join('');

  // Certificates section
  const certificatesHtml = certificates.map(c => 
    `<li><a href="${c.url || '#'}">${escapeHtml(c.name || '')}</a></li>`
  ).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Resume - ${escapeHtml(basics.name || '')}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 1.5cm 1.5cm 1cm 1.5cm;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #333;
    }
    
    a, a:visited { color: #0a75ad; text-decoration: none; }
    a:hover { text-decoration: underline; }
    
    /* Header */
    h1 {
      font-size: 26pt;
      font-weight: 700;
      text-align: center;
      margin-bottom: 0.1em;
      color: #222;
    }
    
    .headline {
      text-align: center;
      font-style: italic;
      font-size: 10pt;
      color: #555;
      margin-bottom: 0.4em;
    }
    
    .contact {
      text-align: center;
      font-size: 9pt;
      color: #444;
      margin-bottom: 0.8em;
    }
    
    .contact-item + .contact-item::before {
      content: " | ";
      padding: 0 5px;
      color: #999;
    }
    
    /* Section headers */
    h2 {
      font-size: 12pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #222;
      border-bottom: 1.5px solid #0a75ad;
      padding-bottom: 0.15em;
      margin: 0.7em 0 0.4em 0;
      page-break-after: avoid;
    }
    
    /* Section lists */
    .section-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    
    .section-list > li {
      padding: 0.35em 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    
    .section-list > li + li {
      border-top: 1px solid #e5e5e5;
    }
    
    /* Grid layout for items */
    .grid-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 1em;
    }
    
    .grid-left {
      flex: 1;
    }
    
    .grid-right {
      flex-shrink: 0;
      text-align: right;
      font-size: 9pt;
      color: #666;
      white-space: nowrap;
    }
    
    .item-title {
      font-weight: 600;
      color: #222;
    }
    
    .item-org {
      color: #0a75ad;
      font-weight: 600;
    }
    
    .item-location {
      font-size: 9pt;
      color: #666;
      margin-top: 0.1em;
    }
    
    .item-desc {
      font-size: 9.5pt;
      color: #444;
      margin-top: 0.15em;
    }
    
    /* Highlights/bullets */
    .highlights {
      list-style: disc;
      margin: 0.2em 0 0 1.2em;
      padding: 0;
    }
    
    .highlights li {
      font-size: 9.5pt;
      margin-bottom: 0.1em;
      color: #444;
    }
    
    /* Skills */
    .skills-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    
    .skills-list li {
      margin-bottom: 0.25em;
      font-size: 9.5pt;
    }
    
    .skill-name {
      font-weight: 600;
      color: #222;
    }
    
    /* Certificates */
    .certs-list {
      list-style: none;
      margin: 0;
      padding: 0;
      column-count: 2;
      column-gap: 2em;
    }
    
    .certs-list li {
      font-size: 9pt;
      margin-bottom: 0.2em;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(basics.name || '')}</h1>
  ${basics.description ? `<div class="headline">${escapeHtml(basics.description)}</div>` : ''}
  <div class="contact">${contactItems.join('')}</div>

  ${educationHtml ? `
    <h2>Education</h2>
    <ul class="section-list">${educationHtml}</ul>
  ` : ''}

  ${workHtml ? `
    <h2>Work Experience</h2>
    <ul class="section-list">${workHtml}</ul>
  ` : ''}

  ${hackathonsHtml ? `
    <h2>Hackathon Awards</h2>
    <ul class="section-list">${hackathonsHtml}</ul>
  ` : ''}

  ${projectsHtml ? `
    <h2>Projects</h2>
    <ul class="section-list">${projectsHtml}</ul>
  ` : ''}

  ${skillsHtml ? `
    <h2>Skills</h2>
    <ul class="skills-list">${skillsHtml}</ul>
  ` : ''}

  ${certificatesHtml ? `
    <h2>Certificates & Awards</h2>
    <ul class="certs-list">${certificatesHtml}</ul>
  ` : ''}
</body>
</html>
`;
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
