// Rule-based ATS checks that run on the text pulled out of the PDF.
// No AI here: these are plain, repeatable checks, so the same resume
// always gets the same result for them. The AI part of the scan (section
// feedback, missing keywords) lives in aiService.atsReview.

// Standard heading names an ATS looks for, grouped by section.
const SECTION_PATTERNS = {
  summary: /^(professional |career )?(summary|profile|objective|about me)$/,
  experience: /^(work |professional |relevant )?(experience|employment|work history|internships?)$/,
  education: /^(education|academic background|academics|qualifications?)$/,
  skills: /^(technical |core |key )?(skills|competencies|skills summary|tech stack)$/,
  projects: /^(academic |personal |key )?projects$/,
  certifications: /^(certifications?|certificates?|courses|licenses)$/,
  achievements: /^(achievements|awards|accomplishments|honors)$/,
};

const normalizeHeading = (line) => line.toLowerCase().replace(/[^a-z& ]/g, '').replace(/\s+/g, ' ').trim();

// Returns every section a heading line names. Combined headings like
// "Education & Certifications" count for both sections.
const findSections = (line) => {
  if (line.length > 40) return [];
  const parts = normalizeHeading(line.replace(/\//g, '&')).split(/\s*&\s*|\s+and\s+/);
  return Object.keys(SECTION_PATTERNS).filter((key) => parts.some((part) => SECTION_PATTERNS[key].test(part)));
};

const runAtsChecks = (text) => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean).length;

  const headingLines = [];
  lines.forEach((line, index) => {
    const sections = findSections(line);
    if (sections.length > 0) headingLines.push({ sections, index });
  });
  const sectionsFound = [...new Set(headingLines.flatMap((h) => h.sections))];

  // In a two-column PDF the text comes out column by column, so headings from
  // the side column end up stacked on consecutive lines with nothing between them.
  const stackedHeadings = headingLines.filter((h, i) => i > 0 && h.index - headingLines[i - 1].index === 1).length;

  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const hasPhone = /(\+?\d[\d\s-]{8,}\d)/.test(text);
  const hasLinkedIn = /linkedin/i.test(text);
  const numbers = (text.match(/\d+(\.\d+)?\s?(%|\+|x\b|k\b)/gi) || []).length;
  // Icon fonts (Font Awesome etc.) live in Unicode's private-use area and come out as garbage.
  const iconChars = (text.match(/[-]/g) || []).length;

  const hasWorkSection = sectionsFound.includes('experience') || sectionsFound.includes('projects');
  const missingCore = ['education', 'skills'].filter((s) => !sectionsFound.includes(s));
  if (!hasWorkSection) missingCore.unshift('experience or projects');

  const checks = [
    {
      id: 'contact',
      label: 'Contact details',
      passed: hasEmail && hasPhone,
      detail: hasEmail && hasPhone
        ? `Email and phone found${hasLinkedIn ? ', plus LinkedIn' : ''}.`
        : `Could not read ${[!hasEmail && 'an email', !hasPhone && 'a phone number'].filter(Boolean).join(' or ')}. Put contact details as plain text in the body, not in a header, footer or image.`,
    },
    {
      id: 'sections',
      label: 'Standard section headings',
      passed: missingCore.length === 0,
      detail: missingCore.length === 0
        ? `Found: ${sectionsFound.join(', ')}.`
        : `No clear heading for: ${missingCore.join(', ')}. Use standard names like "Experience", "Education", "Skills".`,
    },
    {
      id: 'layout',
      label: 'Single-column layout',
      passed: stackedHeadings < 2,
      detail: stackedHeadings < 2
        ? 'Text reads in a normal top-to-bottom order.'
        : 'Headings came out bunched together, which usually means a multi-column or table layout. Many ATS read columns in the wrong order, so use a single column.',
    },
    {
      id: 'length',
      label: 'Resume length',
      passed: words >= 250 && words <= 1000,
      detail: words < 250
        ? `Only about ${words} words. Add more detail on your projects and experience.`
        : words > 1000
          ? `About ${words} words. Trim it to the most relevant 1-2 pages.`
          : `About ${words} words, a good length.`,
    },
    {
      id: 'impact',
      label: 'Measurable results',
      passed: numbers >= 2,
      detail: numbers >= 2
        ? `Found ${numbers} numbers or percentages showing impact.`
        : 'Few numbers found. Where you truly know them, add results like "cut load time by 30%" or "10+ components".',
    },
    {
      id: 'icons',
      label: 'No icons or special symbols',
      passed: iconChars === 0,
      detail: iconChars === 0
        ? 'No unreadable icon characters.'
        : `${iconChars} icon characters could not be read. Replace icons with plain text labels like "Email:".`,
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;

  return {
    checks,
    sectionsFound,
    wordCount: words,
    formatScore: Math.round((passedCount / checks.length) * 100),
  };
};

module.exports = { runAtsChecks };
