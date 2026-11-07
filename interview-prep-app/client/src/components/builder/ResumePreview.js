import React from 'react';
import { prepareResume, withLinks } from './resumeFormat';

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

// Keeps an entry from being split across two pages in the preview.
const keepTogether = { breakInside: 'avoid' };

const Section = ({ title, theme, accent, children }) => (
  <section style={{ marginTop: theme.sectionGap || 12 }}>
    <h2 style={{ fontFamily: 'inherit', ...theme.heading(accent) }}>{title}</h2>
    {children}
  </section>
);

// Text where any URL inside it is a clickable link.
const LinkedText = ({ text, accent }) => withLinks(text).map((part, i) => (part.href
  ? <a key={i} href={part.href} target="_blank" rel="noreferrer" style={{ color: accent }} className="hover:underline break-all">{part.text}</a>
  : <span key={i}>{part.text}</span>));

const Bullets = ({ items, accent }) => {
  if (!items.length) return null;
  return (
    <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
      {items.map((b, i) => <li key={i}><LinkedText text={b} accent={accent} /></li>)}
    </ul>
  );
};

const ResumePreview = ({ content = {}, template = 'classic', accentColor = DEFAULT_ACCENT }) => {
  const theme = TEMPLATES[template] || TEMPLATES.classic;
  const accent = /^#[0-9a-fA-F]{6}$/.test(accentColor || '') ? accentColor : DEFAULT_ACCENT;
  // Same tidy-up as the PDF, so what you see is what you download.
  const r = prepareResume(content);
  const isEmpty = !r.name && !r.experience.length && !r.projects.length && !r.education.length && !r.skills.length;

  if (isEmpty) {
    return (
      <div className="bg-white text-center text-sm text-gray-400 py-24 px-6">
        Your resume preview appears here as you fill in the sections.
      </div>
    );
  }

  const contactColor = theme.contact ? theme.contact(accent).color : '#4b5563';

  return (
    <div className="bg-white text-gray-800 leading-snug px-6 py-7" style={{ fontFamily: theme.font, fontSize: theme.bodySize || 11 }}>
      <header style={theme.header(accent)}>
        <h1 style={{ fontFamily: 'inherit', lineHeight: 1.2, ...theme.name(accent) }}>{r.name || 'Your Name'}</h1>
        {r.headline && <p style={theme.headline(accent)}>{r.headline}</p>}
        {r.contact.length > 0 && (
          <p style={{ fontSize: '0.95em', marginTop: 2, color: contactColor }}>
            {r.contact.map((c, i) => (
              <span key={i}>
                {i > 0 && '  |  '}
                {c.href
                  ? <a href={c.href} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: contactColor }}>{c.text}</a>
                  : c.text}
              </span>
            ))}
          </p>
        )}
      </header>

      {r.summary && (
        <Section title="Summary" theme={theme} accent={accent}>
          <p>{r.summary}</p>
        </Section>
      )}

      {r.experience.length > 0 && (
        <Section title="Experience" theme={theme} accent={accent}>
          {r.experience.map((e, i) => (
            <div key={i} className="mb-2" style={keepTogether}>
              <div className="flex justify-between gap-3">
                <p><span className="font-bold">{e.role}</span>{e.company && <span>{e.role ? ' — ' : ''}{e.company}</span>}</p>
                <p className="text-gray-600 whitespace-nowrap">{e.dates}</p>
              </div>
              {e.location && <p className="text-gray-600">{e.location}</p>}
              <Bullets items={e.bullets} accent={accent} />
            </div>
          ))}
        </Section>
      )}

      {r.projects.length > 0 && (
        <Section title="Projects" theme={theme} accent={accent}>
          {r.projects.map((p, i) => (
            <div key={i} className="mb-2" style={keepTogether}>
              <div className="flex justify-between gap-3">
                <p><span className="font-bold">{p.name}</span>{p.tech && <span className="text-gray-600"> | {p.tech}</span>}</p>
                {p.link && (p.linkHref
                  ? <a href={p.linkHref} target="_blank" rel="noreferrer" className="whitespace-nowrap hover:underline" style={{ color: accent }}>{p.link}</a>
                  : <p className="text-gray-600 whitespace-nowrap">{p.link}</p>)}
              </div>
              <Bullets items={p.bullets} accent={accent} />
            </div>
          ))}
        </Section>
      )}

      {r.skills.length > 0 && (
        <Section title="Skills" theme={theme} accent={accent}>
          {r.skills.map((s, i) => (
            <p key={i}>{s.category && <span className="font-bold">{s.category}: </span>}{s.items}</p>
          ))}
        </Section>
      )}

      {r.education.length > 0 && (
        <Section title="Education" theme={theme} accent={accent}>
          {r.education.map((e, i) => (
            <div key={i} className="mb-1.5" style={keepTogether}>
              <div className="flex justify-between gap-3">
                <p className="font-bold">{e.degree}</p>
                <p className="text-gray-600 whitespace-nowrap">{e.year}</p>
              </div>
              <p>{e.place}{e.details && <span className="text-gray-600"> — {e.details}</span>}</p>
            </div>
          ))}
        </Section>
      )}

      {r.certifications.length > 0 && (
        <Section title="Certifications" theme={theme} accent={accent}>
          <Bullets items={r.certifications} accent={accent} />
        </Section>
      )}
    </div>
  );
};

export default ResumePreview;
