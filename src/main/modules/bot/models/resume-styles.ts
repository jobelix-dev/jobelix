/**
 * Resume CSS Template
 *
 * Clean single-column layout optimised for:
 * - ATS parsing (no tables, no text-boxes, no graphics)
 * - Human readability in ~10 seconds
 * - PDF output via Playwright (A4, 0.5in margins)
 */

export const RESUME_CSS = `
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
