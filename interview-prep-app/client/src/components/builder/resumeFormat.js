// Formatting shared by the on-screen preview and the downloaded PDF, so both
// show the same text. It only tidies how text is displayed; what the user typed
// is saved unchanged.

const URL_PATTERN = /(https?:\/\/[^\s,]+|www\.[^\s,]+)/gi;
const isUrlOnly = (text) => /^(https?:\/\/|www\.)\S+$/i.test(text);

// "  it can insert , delete and update data" -> "It can insert, delete and update data."
export const tidyLine = (text) => {
  let line = (text || '').replace(/\s+/g, ' ').trim();
  if (!line || isUrlOnly(line)) return line;
  line = line.replace(/\s+([,.;:!?)])/g, '$1').replace(/\(\s+/g, '(');
  line = line.charAt(0).toUpperCase() + line.slice(1);
  if (/[A-Za-z0-9)%+]$/.test(line)) line += '.';
  return line;
};

// The same clean-up for short labels (titles, names): no added full stop.
export const tidyLabel = (text) => (text || '').replace(/\s+/g, ' ').replace(/\s+([,.;:)])/g, '$1').trim();

// Where a contact entry should link to, or null if it is only a label like "LinkedIn".
export const hrefFor = (text) => {
  const value = (text || '').trim();
  if (!value) return null;
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(value)) return `mailto:${value}`;
  if (/^\+?[\d\s()-]{8,}$/.test(value)) return `tel:${value.replace(/[^\d+]/g, '')}`;
  if (/^https?:\/\//i.test(value)) return value;
  // Bare domains such as "github.com/you" or "linkedin.com/in/you"
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value)) return `https://${value}`;
  return null;
};

// Splits text into plain parts and links, so URLs inside a bullet become clickable.
export const withLinks = (text) => {
  const parts = [];
  let last = 0;
  (text || '').replace(URL_PATTERN, (match, _g, offset) => {
    if (offset > last) parts.push({ text: text.slice(last, offset) });
    const clean = match.replace(/[.)]+$/, '');
    parts.push({ text: clean, href: /^https?:/i.test(clean) ? clean : `https://${clean}` });
    if (clean.length < match.length) parts.push({ text: match.slice(clean.length) });
    last = offset + match.length;
    return match;
  });
  if (last < (text || '').length) parts.push({ text: text.slice(last) });
  return parts;
};

// "varanasi, india" -> "Varanasi, India". Left alone if the user used any capitals.
const capitalizeIfLower = (text) => (text && text === text.toLowerCase()
  ? text.replace(/\b[a-z]/g, (c) => c.toUpperCase())
  : text);

const clean = (items) => (items || []).map((i) => (typeof i === 'string' ? i.trim() : i)).filter(Boolean);
const hasText = (obj, keys) => keys.some((k) => (obj[k] || '').trim());

// Everything the two renderers need, already filtered and tidied.
export const prepareResume = (content = {}) => {
  const educationLine = (e) => {
    // Skip the location when the school name already ends with it ("..., Meerut, Meerut")
    const repeatsLocation = (e.school || '').toLowerCase().endsWith((e.location || '').toLowerCase().trim());
    return clean([e.school, repeatsLocation ? '' : e.location]).map(tidyLabel).join(', ');
  };

  return {
    name: tidyLabel(content.name),
    headline: tidyLabel(content.headline),
    contact: clean([content.email, content.phone, capitalizeIfLower(content.location), ...(content.links || [])])
      .map((text) => ({ text: tidyLabel(text), href: hrefFor(text) })),
    summary: content.summary?.trim() ? tidyLine(content.summary) : '',
    experience: (content.experience || [])
      .filter((e) => hasText(e, ['role', 'company']) || clean(e.bullets).length)
      .map((e) => ({
        role: tidyLabel(e.role),
        company: tidyLabel(e.company),
        location: tidyLabel(capitalizeIfLower(e.location)),
        dates: clean([e.start, e.end]).join(' – '),
        bullets: clean(e.bullets).map(tidyLine),
      })),
    projects: (content.projects || [])
      .filter((p) => hasText(p, ['name', 'tech']) || clean(p.bullets).length)
      .map((p) => ({
        name: tidyLabel(p.name),
        tech: tidyLabel(p.tech),
        link: (p.link || '').trim(),
        linkHref: hrefFor(p.link),
        bullets: clean(p.bullets).map(tidyLine),
      })),
    skills: (content.skills || [])
      .filter((s) => (s.items || '').trim())
      .map((s) => ({ category: tidyLabel(s.category), items: tidyLabel(s.items) })),
    education: (content.education || [])
      .filter((e) => hasText(e, ['degree', 'school']))
      .map((e) => ({ degree: tidyLabel(e.degree), year: tidyLabel(e.year), place: educationLine(e), details: tidyLabel(e.details) })),
    certifications: clean(content.certifications).map(tidyLabel),
  };
};

export const pdfFileName = (name) => `${(name || 'My').trim().replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'My'}_Resume.pdf`;
