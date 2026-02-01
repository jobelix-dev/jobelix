import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { createLogger } from "../utils/logger.js";
import { getTailoredResumesPath } from "../utils/paths.js";
import { RESUME_CSS } from "./resume-styles.js";
const log = createLogger("ResumeGenerator");
async function generateTailoredResume(options) {
  const { companyName, jobTitle, tailoredConfigYaml, outputDir, scoresJson, page } = options;
  log.info(`Starting resume generation for ${companyName} - ${jobTitle}`);
  log.debug(`Config YAML size: ${tailoredConfigYaml.length} bytes`);
  const outputPath = outputDir || getTailoredResumesPath();
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  log.debug(`Output directory: ${outputPath}`);
  const safeCompanyName = sanitizeFilename(companyName);
  const safeJobTitle = sanitizeFilename(jobTitle);
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").split(".")[0];
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
  try {
    fs.writeFileSync(yamlPath, tailoredConfigYaml, "utf-8");
    log.info(`Saved tailored config: ${yamlPath}`);
  } catch (error) {
    log.error(`Failed to save tailored config: ${error}`);
    throw error;
  }
  if (scoresJson) {
    try {
      fs.writeFileSync(scoresPath, scoresJson, "utf-8");
      log.info(`Saved scoring data: ${scoresPath}`);
    } catch (error) {
      log.warn(`Failed to save scoring data: ${error}`);
    }
  }
  try {
    log.info("Generating resume PDF");
    if (page) {
      await generatePdfWithPlaywright(tailoredConfigYaml, pdfPath, page, companyName, jobTitle);
    } else {
      await generatePdfWithHtml(tailoredConfigYaml, pdfPath, companyName, jobTitle);
    }
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      log.debug(`PDF file size: ${stats.size} bytes`);
      log.info(`\u2705 Resume generated successfully: ${pdfPath}`);
    } else {
      throw new Error(`PDF file was not created at expected path: ${pdfPath}`);
    }
    return {
      pdfPath,
      yamlPath,
      scoresPath: scoresJson ? scoresPath : void 0
    };
  } catch (error) {
    log.error(`\u274C Error generating resume: ${error}`);
    throw new Error(`Failed to generate resume for ${companyName}: ${error}`);
  }
}
async function generatePdfWithPlaywright(yamlContent, outputPath, page, companyName, jobTitle) {
  const config = yaml.load(yamlContent);
  const html = generateResumeHtml(config, companyName, jobTitle);
  const browser = page.context().browser();
  if (!browser) {
    throw new Error("Browser not available for PDF generation");
  }
  const pdfPage = await browser.newPage();
  try {
    await pdfPage.setContent(html, { waitUntil: "networkidle" });
    await pdfPage.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in"
      }
    });
    log.info("PDF generated with Playwright");
  } finally {
    await pdfPage.close();
  }
}
async function generatePdfWithHtml(yamlContent, outputPath, companyName, jobTitle) {
  const config = yaml.load(yamlContent);
  const html = generateResumeHtml(config, companyName, jobTitle);
  const htmlPath = outputPath.replace(".pdf", ".html");
  fs.writeFileSync(htmlPath, html, "utf-8");
  log.warn("No browser page provided - HTML saved to: " + htmlPath);
  log.warn("PDF generation requires a browser. Please provide a Playwright page or use external PDF converter.");
  throw new Error("PDF generation requires a browser page. Provide options.page parameter.");
}
function generateResumeHtml(config, companyName, jobTitle) {
  const basics = config.basics || config.personal_information || {};
  const work = config.work || config.experience_details || [];
  const education = config.education || config.education_details || [];
  const projects = config.projects || [];
  const skills = config.skills || [];
  const certificates = config.certificates || [];
  const languages = skills.find((s) => s.name === "Languages")?.keywords || [];
  const technicalSkills = skills.filter((s) => s.name !== "Languages");
  const contactItems = [
    basics.email ? { icon: "\u2709", text: basics.email, href: `mailto:${basics.email}` } : null,
    basics.phone ? { icon: "\u{1F4F1}", text: basics.phone } : null,
    basics.location?.city ? { icon: "\u{1F4CD}", text: basics.location.city } : null
  ].filter((item) => item !== null);
  const profileLinks = (basics.profiles || []).map((p) => ({
    network: p.network,
    url: p.url,
    icon: getNetworkIcon(p.network)
  }));
  const skillsHtml = technicalSkills.map((skillGroup) => {
    const keywords = skillGroup.keywords || [];
    if (keywords.length === 0) return "";
    return `
      <div class="skill-category">
        <div class="skill-title">${escapeHtml(skillGroup.name || "Technical Skills")}</div>
        <div class="skill-tags">
          ${keywords.slice(0, 12).map((k) => `<span class="skill-tag">${escapeHtml(k)}</span>`).join("")}
        </div>
      </div>
    `;
  }).filter(Boolean).join("");
  const languagesHtml = languages.length > 0 ? `
    <div class="sidebar-section">
      <h3 class="sidebar-heading">
        <span class="heading-icon">\u{1F310}</span>
        Languages
      </h3>
      <div class="languages-list">
        ${languages.map((lang) => `<div class="language-item">${escapeHtml(lang)}</div>`).join("")}
      </div>
    </div>
  ` : "";
  const workHtml = work.map((job, index) => `
    <div class="experience-item${index > 0 ? " mt-item" : ""}">
      <div class="experience-header">
        <div class="experience-title-row">
          <h3 class="experience-title">${escapeHtml(job.position || job.title || "")}</h3>
          <span class="experience-date">${formatDateRange(job.startDate, job.endDate)}</span>
        </div>
        <div class="experience-company">${escapeHtml(job.company || job.name || "")}</div>
      </div>
      ${job.summary || job.description ? `<p class="experience-summary">${escapeHtml(job.summary || job.description || "")}</p>` : ""}
      ${job.highlights && job.highlights.length > 0 ? `
        <ul class="experience-highlights">
          ${job.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}
        </ul>
      ` : ""}
    </div>
  `).join("");
  const educationHtml = education.map((edu, index) => `
    <div class="education-item${index > 0 ? " mt-item" : ""}">
      <div class="education-header">
        <div class="education-title-row">
          <h3 class="education-title">${escapeHtml(edu.area || edu.studyType || "")}</h3>
          <span class="education-date">${formatDateRange(edu.startDate, edu.endDate)}</span>
        </div>
        <div class="education-institution">${escapeHtml(edu.institution || "")}</div>
      </div>
      ${edu.score ? `<div class="education-score">GPA: ${escapeHtml(edu.score)}</div>` : ""}
    </div>
  `).join("");
  const projectsHtml = projects.slice(0, 6).map((proj, index) => `
    <div class="project-item${index > 0 ? " mt-item-sm" : ""}">
      <div class="project-header">
        <h3 class="project-title">${escapeHtml(proj.name || "")}</h3>
        ${proj.url ? `<a href="${escapeHtml(proj.url)}" class="project-link">\u2197</a>` : ""}
      </div>
      <p class="project-description">${escapeHtml(truncateText(proj.description || "", 150))}</p>
    </div>
  `).join("");
  const certificationsHtml = certificates.length > 0 ? `
    <div class="sidebar-section">
      <h3 class="sidebar-heading">
        <span class="heading-icon">\u{1F3C6}</span>
        Certifications
      </h3>
      <div class="certifications-list">
        ${certificates.slice(0, 4).map((cert) => `
          <div class="certification-item">
            <div class="cert-name">${escapeHtml(cert.name || cert.title || "")}</div>
            ${cert.issuer ? `<div class="cert-issuer">${escapeHtml(cert.issuer)}</div>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume - ${escapeHtml(basics.name || "")} - ${escapeHtml(companyName)}</title>
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
          <span class="heading-icon">\u{1F4E7}</span>
          Contact
        </h3>
        <div class="contact-list">
          ${contactItems.map((item) => `
            <div class="contact-item">
              <span class="contact-icon">${item.icon}</span>
              ${item.href ? `<a href="${escapeHtml(item.href)}">${escapeHtml(item.text)}</a>` : `<span>${escapeHtml(item.text)}</span>`}
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Profile Links -->
      ${profileLinks.length > 0 ? `
        <div class="sidebar-section">
          <h3 class="sidebar-heading">
            <span class="heading-icon">\u{1F517}</span>
            Profiles
          </h3>
          <div class="profile-links">
            ${profileLinks.map((link) => `
              <a href="${escapeHtml(link.url)}" class="profile-link">
                <span>${link.icon}</span>
                <span>${escapeHtml(link.network)}</span>
              </a>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <!-- Skills -->
      ${skillsHtml ? `
        <div class="sidebar-section">
          <h3 class="sidebar-heading">
            <span class="heading-icon">\u26A1</span>
            Skills
          </h3>
          ${skillsHtml}
        </div>
      ` : ""}

      <!-- Languages -->
      ${languagesHtml}

      <!-- Certifications -->
      ${certificationsHtml}
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Header -->
      <header class="header">
        <h1 class="name">${escapeHtml(basics.name || "")}</h1>
        ${basics.label || jobTitle ? `<div class="headline">${escapeHtml(basics.label || jobTitle)}</div>` : ""}
      </header>

      <!-- Summary -->
      ${basics.summary ? `
        <section class="section">
          <h2 class="section-heading">Professional Summary</h2>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${escapeHtml(basics.summary)}</p>
        </section>
      ` : ""}

      <!-- Experience -->
      ${workHtml ? `
        <section class="section">
          <h2 class="section-heading">Experience</h2>
          ${workHtml}
        </section>
      ` : ""}

      <!-- Education -->
      ${educationHtml ? `
        <section class="section">
          <h2 class="section-heading">Education</h2>
          ${educationHtml}
        </section>
      ` : ""}

      <!-- Projects -->
      ${projectsHtml ? `
        <section class="section">
          <h2 class="section-heading">Projects</h2>
          ${projectsHtml}
        </section>
      ` : ""}
    </main>
  </div>
</body>
</html>
  `.trim();
}
function getNetworkIcon(network) {
  const icons = {
    "LinkedIn": "\u{1F4BC}",
    "GitHub": "\u{1F419}",
    "Twitter": "\u{1F426}",
    "Portfolio": "\u{1F310}",
    "Website": "\u{1F310}",
    "Kaggle": "\u{1F4CA}",
    "StackOverflow": "\u{1F4DA}"
  };
  return icons[network] || "\u{1F517}";
}
function formatDateRange(startDate, endDate) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  if (start === "Present" && end === "Present") return "Present";
  if (start === end) return start;
  return `${start} \u2013 ${end}`;
}
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}
function sanitizeFilename(name) {
  const cleaned = name.replace(/[^a-zA-Z0-9 \-_]/g, "").trim();
  return cleaned.replace(/\s+/g, "_");
}
function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function formatDate(date) {
  if (!date) return "Present";
  if (date.toLowerCase() === "present" || date.toLowerCase() === "current") {
    return "Present";
  }
  return date;
}
function validateYamlConfig(yamlContent) {
  try {
    yaml.load(yamlContent);
    return true;
  } catch (error) {
    log.error(`Invalid YAML configuration: ${error}`);
    return false;
  }
}
function cleanupOldResumes(outputDir, maxFiles = 50) {
  try {
    const outputPath = outputDir || getTailoredResumesPath();
    if (!fs.existsSync(outputPath)) {
      return;
    }
    const files = fs.readdirSync(outputPath).filter((f) => f.endsWith(".pdf") || f.endsWith(".yaml")).map((f) => ({
      name: f,
      path: path.join(outputPath, f),
      mtime: fs.statSync(path.join(outputPath, f)).mtime.getTime()
    })).sort((a, b) => a.mtime - b.mtime);
    if (files.length <= maxFiles) {
      return;
    }
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
export {
  cleanupOldResumes,
  generateTailoredResume,
  validateYamlConfig
};
//# sourceMappingURL=resume-generator.js.map
