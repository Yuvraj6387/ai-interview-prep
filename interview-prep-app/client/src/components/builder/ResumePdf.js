import React from 'react';
import { Document, Page, View, Text, Link, StyleSheet, Font, pdf } from '@react-pdf/renderer';
import { prepareResume, withLinks, pdfFileName } from './resumeFormat';
import { DEFAULT_ACCENT } from './ResumePreview';

// Builds the resume as a real PDF file in the browser. The text stays real text
// (an ATS can read it), links are clickable, and nothing from the browser's print
// dialog (date, page title, URL) ends up on the page. This file is only loaded
// when someone clicks Download, because the PDF library is large.

// Never split words with a hyphen; URLs and emails broke as "github.co-m" otherwise.
Font.registerHyphenationCallback((word) => [word]);

// PDF's built-in fonts. Each weight/style is its own font name, so bold and
// italic must name the right one ("fontWeight: bold" alone has no effect).
const SANS = { regular: 'Helvetica', bold: 'Helvetica-Bold', italic: 'Helvetica-Oblique' };
const SERIF = { regular: 'Times-Roman', bold: 'Times-Bold', italic: 'Times-Italic' };

// Turns { fontWeight: 'bold' } / { fontStyle: 'italic' } into the matching font name.
const withFont = (style, font) => {
  const { fontWeight, fontStyle, ...rest } = style;
  if (fontWeight === 'bold') return { ...rest, fontFamily: font.bold };
  if (fontStyle === 'italic') return { ...rest, fontFamily: font.italic };
  return rest;
};

// The same six templates as the on-screen preview, in PDF points (1pt = 1/72 inch).
const THEMES = {
  classic: {
    font: SANS,
    header: () => ({ alignItems: 'center' }),
    name: () => ({ fontSize: 20, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: '#111827' }),
    headline: () => ({ fontSize: 10.5, color: '#374151' }),
    heading: (a) => ({ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: a, borderBottomWidth: 0.8, borderBottomColor: a, paddingBottom: 2, marginBottom: 5 }),
  },
  modern: {
    font: SANS,
    header: (a) => ({ borderLeftWidth: 3, borderLeftColor: a, paddingLeft: 9 }),
    name: () => ({ fontSize: 20, fontWeight: 'bold', color: '#111827' }),
    headline: (a) => ({ fontSize: 10.5, fontWeight: 'bold', color: a }),
    heading: (a) => ({ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: a, borderBottomWidth: 0.8, borderBottomColor: `${a}55`, paddingBottom: 2, marginBottom: 5 }),
  },
  minimal: {
    font: SANS,
    sectionGap: 13,
    header: () => ({}),
    name: (a) => ({ fontSize: 22, color: a }),
    headline: () => ({ fontSize: 10.5, color: '#6b7280' }),
    heading: (a) => ({ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, color: a, marginBottom: 4 }),
  },
  elegant: {
    font: SERIF,
    header: (a) => ({ alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: a, paddingBottom: 6 }),
    name: () => ({ fontSize: 22, letterSpacing: 0.5, color: '#111827' }),
    headline: (a) => ({ fontSize: 11, fontStyle: 'italic', color: a }),
    heading: (a) => ({ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1, color: a, borderBottomWidth: 0.8, borderBottomColor: `${a}55`, paddingBottom: 2, marginBottom: 5 }),
  },
  compact: {
    font: SANS,
    bodySize: 8.5,
    sectionGap: 7,
    header: () => ({}),
    name: () => ({ fontSize: 17, fontWeight: 'bold', color: '#111827' }),
    headline: (a) => ({ fontSize: 9.5, fontWeight: 'bold', color: a }),
    heading: (a) => ({ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.6, color: a, backgroundColor: `${a}1a`, paddingVertical: 2, paddingHorizontal: 5, marginBottom: 3 }),
  },
  bold: {
    font: SANS,
    header: (a) => ({ backgroundColor: a, padding: 12, borderRadius: 3 }),
    name: () => ({ fontSize: 21, fontWeight: 'bold', color: '#ffffff' }),
    headline: () => ({ fontSize: 10.5, fontWeight: 'bold', color: '#ffffffdd' }),
    contact: () => ({ color: '#ffffffcc' }),
    heading: (a) => ({ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.6, color: a, borderBottomWidth: 1.5, borderBottomColor: a, paddingBottom: 2, marginBottom: 5 }),
  },
};

const styles = StyleSheet.create({
  // The same margin on every page, so page 2 lines up with page 1.
  page: { paddingTop: 30, paddingBottom: 30, paddingHorizontal: 34, color: '#1f2937', lineHeight: 1.35 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: '#4b5563' },
  bold: { color: '#111827' },
  bulletRow: { flexDirection: 'row', marginTop: 1.5, paddingLeft: 4 },
  bulletDot: { width: 9 },
  bulletText: { flex: 1 },
  entry: { marginBottom: 6 },
  link: { textDecoration: 'none' },
});

// Text where any URL inside it is a clickable link.
const LinkedText = ({ children, style, linkColor }) => (
  <Text style={style}>
    {withLinks(children).map((part, i) => (part.href
      ? <Link key={i} src={part.href} style={{ ...styles.link, color: linkColor }}>{part.text}</Link>
      : <Text key={i}>{part.text}</Text>))}
  </Text>
);

const Bullets = ({ items, linkColor }) => items.map((b, i) => (
  <View key={i} style={styles.bulletRow}>
    <Text style={styles.bulletDot}>•</Text>
    <LinkedText style={styles.bulletText} linkColor={linkColor}>{b}</LinkedText>
  </View>
));

const Section = ({ title, theme, accent, children }) => (
  <View style={{ marginTop: theme.sectionGap || 10 }}>
    {/* minPresenceAhead stops a heading being left alone at the bottom of a page */}
    <Text style={withFont(theme.heading(accent), theme.font)} minPresenceAhead={30}>{title}</Text>
    {children}
  </View>
);

export const ResumeDocument = ({ content, template, accentColor }) => {
  const theme = THEMES[template] || THEMES.classic;
  const accent = /^#[0-9a-fA-F]{6}$/.test(accentColor || '') ? accentColor : DEFAULT_ACCENT;
  const r = prepareResume(content);
  const contactStyle = { fontSize: (theme.bodySize || 9.5) - 0.5, marginTop: 2, ...styles.muted, ...(theme.contact ? theme.contact(accent) : {}) };

  return (
    <Document title={`${r.name || 'Resume'} - Resume`} author={r.name} creator="InterviewPrep AI" producer="InterviewPrep AI">
      <Page size="A4" style={{ ...styles.page, fontFamily: theme.font.regular, fontSize: theme.bodySize || 9.5 }}>
        <View style={theme.header(accent)}>
          <Text style={withFont(theme.name(accent), theme.font)}>{r.name || 'Your Name'}</Text>
          {!!r.headline && <Text style={withFont(theme.headline(accent), theme.font)}>{r.headline}</Text>}
          {r.contact.length > 0 && (
            // Each item is its own piece in a wrapping row, so a long line breaks
            // cleanly between items (one long run of text got a stray "-").
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 2, justifyContent: theme.header(accent).alignItems === 'center' ? 'center' : 'flex-start' }}>
              {r.contact.map((c, i) => (
                <View key={i} style={{ flexDirection: 'row' }}>
                  {c.href
                    ? <Link src={c.href} style={{ ...contactStyle, ...styles.link, marginTop: 0 }}>{c.text}</Link>
                    : <Text style={{ ...contactStyle, marginTop: 0 }}>{c.text}</Text>}
                  {/* The divider stays with the item before it, so no line starts with "|" */}
                  {i < r.contact.length - 1 && <Text style={{ ...contactStyle, marginTop: 0, marginHorizontal: 5 }}>|</Text>}
                </View>
              ))}
            </View>
          )}
        </View>

        {!!r.summary && (
          <Section title="Summary" theme={theme} accent={accent}>
            <Text>{r.summary}</Text>
          </Section>
        )}

        {r.experience.length > 0 && (
          <Section title="Experience" theme={theme} accent={accent}>
            {r.experience.map((e, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <View style={styles.row}>
                  <Text style={{ flex: 1 }}>
                    <Text style={{ ...styles.bold, fontFamily: theme.font.bold }}>{e.role}</Text>{!!e.company && `${e.role ? ' — ' : ''}${e.company}`}
                  </Text>
                  {!!e.dates && <Text style={styles.muted}>{e.dates}</Text>}
                </View>
                {!!e.location && <Text style={styles.muted}>{e.location}</Text>}
                <Bullets items={e.bullets} linkColor={accent} />
              </View>
            ))}
          </Section>
        )}

        {r.projects.length > 0 && (
          <Section title="Projects" theme={theme} accent={accent}>
            {r.projects.map((p, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <View style={styles.row}>
                  <Text style={{ flex: 1 }}>
                    <Text style={{ ...styles.bold, fontFamily: theme.font.bold }}>{p.name}</Text>
                    {!!p.tech && <Text style={styles.muted}>{`  |  ${p.tech}`}</Text>}
                  </Text>
                  {!!p.link && (p.linkHref
                    ? <Link src={p.linkHref} style={{ ...styles.link, color: accent }}>{p.link}</Link>
                    : <Text style={styles.muted}>{p.link}</Text>)}
                </View>
                <Bullets items={p.bullets} linkColor={accent} />
              </View>
            ))}
          </Section>
        )}

        {r.skills.length > 0 && (
          <Section title="Skills" theme={theme} accent={accent}>
            {r.skills.map((s, i) => (
              <Text key={i} style={{ marginBottom: 1 }}>
                {!!s.category && <Text style={{ ...styles.bold, fontFamily: theme.font.bold }}>{`${s.category}: `}</Text>}{s.items}
              </Text>
            ))}
          </Section>
        )}

        {r.education.length > 0 && (
          <Section title="Education" theme={theme} accent={accent}>
            {r.education.map((e, i) => (
              <View key={i} style={{ marginBottom: 4 }} wrap={false}>
                <View style={styles.row}>
                  <Text style={{ ...styles.bold, fontFamily: theme.font.bold, flex: 1 }}>{e.degree}</Text>
                  {!!e.year && <Text style={styles.muted}>{e.year}</Text>}
                </View>
                <Text>{e.place}{!!e.details && <Text style={styles.muted}>{` — ${e.details}`}</Text>}</Text>
              </View>
            ))}
          </Section>
        )}

        {r.certifications.length > 0 && (
          <Section title="Certifications" theme={theme} accent={accent}>
            <Bullets items={r.certifications} linkColor={accent} />
          </Section>
        )}
      </Page>
    </Document>
  );
};

// Creates the PDF and saves it straight to the device as "First_Last_Resume.pdf".
export const downloadResumePdf = async ({ content, template, accentColor }) => {
  const blob = await pdf(<ResumeDocument content={content} template={template} accentColor={accentColor} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pdfFileName(content.name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
