import React from 'react';

export const DEFAULT_ACCENT = '#0e7490';

// Every template is single-column with plain text headings, so an ATS reads
// them top to bottom. They differ only in font, alignment and how the accent
// colour is used. `a` is the chosen colour; `${a}55` is the same colour at
// about one-third opacity (8-digit hex), used for lighter lines and tints.
export const TEMPLATES = {
  classic: {
    label: 'Classic',
    font: 'Arial, Helvetica, sans-serif',
    header: () => ({ textAlign: 'center' }),
    name: () => ({ fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#111827' }),
    headline: () => ({ fontSize: 12, color: '#374151' }),
    heading: (a) => ({ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: a, borderBottom: `1px solid ${a}`, paddingBottom: 2, marginBottom: 6 }),
  },
  modern: {
    label: 'Modern',
    font: 'Arial, Helvetica, sans-serif',
    header: (a) => ({ textAlign: 'left', borderLeft: `4px solid ${a}`, paddingLeft: 12 }),
    name: () => ({ fontSize: 22, fontWeight: 700, color: '#111827' }),
    headline: (a) => ({ fontSize: 12, fontWeight: 600, color: a }),
    heading: (a) => ({ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: a, borderBottom: `1px solid ${a}55`, paddingBottom: 2, marginBottom: 6 }),
  },
  minimal: {
    label: 'Minimal',
    font: 'Helvetica, Arial, sans-serif',
    header: () => ({ textAlign: 'left' }),
    name: (a) => ({ fontSize: 24, fontWeight: 300, color: a }),
    headline: () => ({ fontSize: 12, color: '#6b7280' }),
    heading: (a) => ({ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: a, marginBottom: 5 }),
    sectionGap: 16,
  },
  elegant: {
    label: 'Elegant',
    font: 'Georgia, "Times New Roman", serif',
    header: (a) => ({ textAlign: 'center', borderBottom: `2px double ${a}`, paddingBottom: 8 }),
    name: () => ({ fontSize: 24, fontWeight: 400, letterSpacing: '0.03em', color: '#111827' }),
    headline: (a) => ({ fontSize: 12, fontStyle: 'italic', color: a }),
    heading: (a) => ({ fontSize: 12, fontWeight: 400, fontVariant: 'small-caps', letterSpacing: '0.06em', color: a, borderBottom: `1px solid ${a}55`, paddingBottom: 2, marginBottom: 6 }),
  },
  compact: {
    label: 'Compact',
    font: 'Arial, Helvetica, sans-serif',
    bodySize: 10,
    header: () => ({ textAlign: 'left' }),
    name: () => ({ fontSize: 19, fontWeight: 700, color: '#111827' }),
    headline: (a) => ({ fontSize: 11, fontWeight: 600, color: a }),
    heading: (a) => ({ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: a, background: `${a}1a`, padding: '2px 6px', marginBottom: 4 }),
    sectionGap: 8,
  },
  bold: {
    label: 'Bold',
    font: 'Arial, Helvetica, sans-serif',
    header: (a) => ({ textAlign: 'left', background: a, color: '#fff', padding: '14px 16px', borderRadius: 4 }),
    name: () => ({ fontSize: 23, fontWeight: 800, color: '#fff' }),
    headline: () => ({ fontSize: 12, fontWeight: 600, color: '#ffffffdd' }),
    contact: () => ({ color: '#ffffffcc' }),
    heading: (a) => ({ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: a, borderBottom: `2px solid ${a}`, paddingBottom: 2, marginBottom: 6 }),
  },
};

const clean = (items) => (items || []).map((i) => (typeof i === 'string' ? i.trim() : i)).filter(Boolean);
const hasText = (obj, keys) => keys.some((k) => (obj[k] || '').trim());
// Keeps an entry from being split across two PDF pages.
const keepTogether = { breakInside: 'avoid' };

const Section = ({ title, theme, accent, children }) => (
  <section style={{ marginTop: theme.sectionGap || 12 }}>
    <h2 style={{ fontFamily: 'inherit', ...theme.heading(accent) }}>{title}</h2>
    {children}
  </section>
);

const Bullets = ({ items }) => {
  const list = clean(items);
  if (list.length === 0) return null;
  return (
    <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
      {list.map((b, i) => <li key={i}>{b}</li>)}
    </ul>
  );
};

const ResumePreview = ({ content = {}, template = 'classic', accentColor = DEFAULT_ACCENT }) => {
  const theme = TEMPLATES[template] || TEMPLATES.classic;
  const accent = /^#[0-9a-fA-F]{6}$/.test(accentColor || '') ? accentColor : DEFAULT_ACCENT;
  const contact = clean([content.email, content.phone, content.location, ...(content.links || [])]);
  const experience = (content.experience || []).filter((e) => hasText(e, ['role', 'company']) || clean(e.bullets).length);
  const projects = (content.projects || []).filter((p) => hasText(p, ['name', 'tech']) || clean(p.bullets).length);
  const education = (content.education || []).filter((e) => hasText(e, ['degree', 'school']));
  const skills = (content.skills || []).filter((s) => (s.items || '').trim());
  const certifications = clean(content.certifications);
  const isEmpty = !content.name && !experience.length && !projects.length && !education.length && !skills.length;

  if (isEmpty) {
    return (
      <div className="bg-white text-center text-sm text-gray-400 py-24 px-6">
        Your resume preview appears here as you fill in the sections.
      </div>
    );
  }

  return (
    <div className="bg-white text-gray-800 leading-snug p-8" style={{ fontFamily: theme.font, fontSize: theme.bodySize || 11 }}>
      <header style={theme.header(accent)}>
        <h1 style={{ fontFamily: 'inherit', lineHeight: 1.2, ...theme.name(accent) }}>{content.name || 'Your Name'}</h1>
        {content.headline && <p style={theme.headline(accent)}>{content.headline}</p>}
        {contact.length > 0 && (
          <p style={{ fontSize: '0.95em', color: '#4b5563', marginTop: 2, ...(theme.contact ? theme.contact(accent) : {}) }}>
            {contact.join('  |  ')}
          </p>
        )}
      </header>

      {content.summary?.trim() && (
        <Section title="Summary" theme={theme} accent={accent}>
          <p>{content.summary}</p>
        </Section>
      )}

      {experience.length > 0 && (
        <Section title="Experience" theme={theme} accent={accent}>
          {experience.map((e, i) => (
            <div key={i} className="mb-2" style={keepTogether}>
              <div className="flex justify-between gap-3">
                <p><span className="font-bold">{e.role}</span>{e.company && <span>{e.role ? ' — ' : ''}{e.company}</span>}</p>
                <p className="text-gray-600 whitespace-nowrap">{clean([e.start, e.end]).join(' – ')}</p>
              </div>
              {e.location && <p className="text-gray-600">{e.location}</p>}
              <Bullets items={e.bullets} />
            </div>
          ))}
        </Section>
      )}

      {projects.length > 0 && (
        <Section title="Projects" theme={theme} accent={accent}>
          {projects.map((p, i) => (
            <div key={i} className="mb-2" style={keepTogether}>
              <div className="flex justify-between gap-3">
                <p><span className="font-bold">{p.name}</span>{p.tech && <span className="text-gray-600"> | {p.tech}</span>}</p>
                {p.link && <p className="text-gray-600 whitespace-nowrap">{p.link}</p>}
              </div>
              <Bullets items={p.bullets} />
            </div>
          ))}
        </Section>
      )}

      {skills.length > 0 && (
        <Section title="Skills" theme={theme} accent={accent}>
          {skills.map((s, i) => (
            <p key={i}>{s.category && <span className="font-bold">{s.category}: </span>}{s.items}</p>
          ))}
        </Section>
      )}

      {education.length > 0 && (
        <Section title="Education" theme={theme} accent={accent}>
          {education.map((e, i) => (
            <div key={i} className="mb-1.5" style={keepTogether}>
              <div className="flex justify-between gap-3">
                <p className="font-bold">{e.degree}</p>
                <p className="text-gray-600 whitespace-nowrap">{e.year}</p>
              </div>
              {/* Skip the location when the school name already ends with it ("..., Meerut, Meerut") */}
              <p>{clean([e.school, (e.school || '').toLowerCase().endsWith((e.location || '').toLowerCase().trim()) ? '' : e.location]).join(', ')}{e.details && <span className="text-gray-600"> — {e.details}</span>}</p>
            </div>
          ))}
        </Section>
      )}

      {certifications.length > 0 && (
        <Section title="Certifications" theme={theme} accent={accent}>
          <Bullets items={certifications} />
        </Section>
      )}
    </div>
  );
};

export default ResumePreview;
