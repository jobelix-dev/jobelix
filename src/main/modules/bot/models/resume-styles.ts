/**
 * Resume CSS Template
 * 
 * CSS styles for the PDF resume generation.
 * Enterprise-grade two-column layout with:
 * - Professional typography with Inter font
 * - Clear visual hierarchy
 * - Consistent spacing system
 * - ATS-friendly structure
 */

export const RESUME_CSS = `
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
`;
