import React from 'react';

// Both templates are single-column with plain text headings, so an ATS reads
// them top to bottom without trouble. They only differ in alignment and accent.
const TEMPLATES = {
  classic: {
    header: 'text-center',
    name: 'text-[22px] font-bold uppercase tracking-wide text-gray-900',
    headline: 'text-[12px] text-gray-700',
    heading: 'text-[11px] font-bold uppercase tracking-wider text-gray-900 border-b border-gray-800 pb-0.5 mb-1.5',
  },
  modern: {
    header: 'text-left border-l-4 border-cyan-700 pl-3',
    name: 'text-[22px] font-bold text-gray-900',
    headline: 'text-[12px] font-semibold text-cyan-700',
    heading: 'text-[11px] font-bold uppercase tracking-wider text-cyan-700 border-b border-cyan-200 pb-0.5 mb-1.5',
  },
};

const clean = (items) => (items || []).map((i) => (typeof i === 'string' ? i.trim() : i)).filter(Boolean);
const hasText = (obj, keys) => keys.some((k) => (obj[k] || '').trim());
// Keeps an entry from being split across two PDF pages.
const keepTogether = { breakInside: 'avoid' };

const Section = ({ title, style, children }) => (
  <section className="mt-3">
    <h2 className={style.heading}>{title}</h2>
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

const ResumePreview = ({ content = {}, template = 'classic' }) => {
  const style = TEMPLATES[template] || TEMPLATES.classic;
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
    <div className="bg-white text-gray-800 text-[11px] leading-snug p-8" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <header className={style.header}>
        <h1 className={style.name} style={{ fontFamily: 'inherit' }}>{content.name || 'Your Name'}</h1>
        {content.headline && <p className={style.headline}>{content.headline}</p>}
        {contact.length > 0 && <p className="text-[10.5px] text-gray-600 mt-0.5">{contact.join('  |  ')}</p>}
      </header>

      {content.summary?.trim() && (
        <Section title="Summary" style={style}>
          <p>{content.summary}</p>
        </Section>
      )}

      {experience.length > 0 && (
        <Section title="Experience" style={style}>
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
        <Section title="Projects" style={style}>
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
        <Section title="Skills" style={style}>
          {skills.map((s, i) => (
            <p key={i}>{s.category && <span className="font-bold">{s.category}: </span>}{s.items}</p>
          ))}
        </Section>
      )}

      {education.length > 0 && (
        <Section title="Education" style={style}>
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
        <Section title="Certifications" style={style}>
          <Bullets items={certifications} />
        </Section>
      )}
    </div>
  );
};

export default ResumePreview;
