import React from 'react';
import { Link } from 'react-router-dom';
import { FiChevronDown, FiPlus, FiTrash2, FiArrowUp, FiArrowDown, FiZap, FiLoader } from 'react-icons/fi';

const INPUT = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-smooth';

// Lists edited as "one item per line" in a textarea.
const toLines = (items) => (items || []).join('\n');
const fromLines = (text) => text.split('\n');

export const SectionCard = ({ title, icon: Icon, tint, open, onToggle, children }) => (
  <div className="border border-gray-200 rounded-xl bg-white">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 text-left"
    >
      <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${tint}`}>
        <Icon size={13} />
      </span>
      <span className="flex-1 text-sm font-semibold text-gray-800">{title}</span>
      <FiChevronDown className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">{children}</div>}
  </div>
);

const Field = ({ label, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
    {children}
  </label>
);

export const ProfileFields = ({ content, update }) => {
  const set = (key) => (e) => update({ ...content, [key]: e.target.value });
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="Full name"><input className={INPUT} value={content.name || ''} onChange={set('name')} /></Field>
      <Field label="Headline"><input className={INPUT} value={content.headline || ''} onChange={set('headline')} placeholder="e.g. Full Stack Developer (MERN)" /></Field>
      <Field label="Email"><input className={INPUT} value={content.email || ''} onChange={set('email')} /></Field>
      <Field label="Phone"><input className={INPUT} value={content.phone || ''} onChange={set('phone')} /></Field>
      <Field label="Location"><input className={INPUT} value={content.location || ''} onChange={set('location')} placeholder="City, Country" /></Field>
      <Field label="Links (one per line)" className="sm:row-span-2">
        <textarea
          rows="3"
          className={INPUT}
          value={toLines(content.links)}
          onChange={(e) => update({ ...content, links: fromLines(e.target.value) })}
          placeholder={'linkedin.com/in/you\ngithub.com/you'}
        />
      </Field>
    </div>
  );
};

export const SummaryField = ({ content, update, onGenerate, generating }) => (
  <>
    <textarea
      rows="4"
      className={INPUT}
      value={content.summary || ''}
      onChange={(e) => update({ ...content, summary: e.target.value })}
      placeholder="2-3 sentences on who you are and what you have built"
    />
    <button
      type="button"
      onClick={onGenerate}
      disabled={generating}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition-smooth disabled:opacity-50"
    >
      {generating ? <FiLoader className="animate-spin" /> : <FiZap />}
      {generating ? 'Writing...' : 'Write it with AI'}
    </button>
    <p className="text-[11px] text-gray-400">Uses only what is already in your resume. Any number it can't find there shows as &lt;X&gt;.</p>
  </>
);

// Experience, projects and education are all "a list of entries with some fields".
export const EntryList = ({ items = [], onChange, fields, withBullets, addLabel, emptyEntry }) => {
  const setItem = (index, patch) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const remove = (index) => onChange(items.filter((_, i) => i !== index));
  const move = (index, delta) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-2.5">
          <div className="flex items-center justify-end gap-1 -mb-1">
            <button type="button" title="Move up" onClick={() => move(index, -1)} className="p-1.5 text-gray-400 hover:text-orange-700 rounded"><FiArrowUp size={14} /></button>
            <button type="button" title="Move down" onClick={() => move(index, 1)} className="p-1.5 text-gray-400 hover:text-orange-700 rounded"><FiArrowDown size={14} /></button>
            <button type="button" title="Remove" onClick={() => remove(index)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><FiTrash2 size={14} /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {fields.map(({ key, label, placeholder, wide }) => (
              <Field key={key} label={label} className={wide ? 'sm:col-span-2' : ''}>
                <input
                  className={INPUT}
                  value={item[key] || ''}
                  placeholder={placeholder}
                  onChange={(e) => setItem(index, { [key]: e.target.value })}
                />
              </Field>
            ))}
          </div>
          {withBullets && (
            <Field label="Bullet points (one per line)">
              <textarea
                rows="4"
                className={INPUT}
                value={toLines(item.bullets)}
                onChange={(e) => setItem(index, { bullets: fromLines(e.target.value) })}
                placeholder="Start each line with an action verb: Built, Integrated, Reduced..."
              />
            </Field>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, emptyEntry])}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-orange-700 border border-dashed border-orange-300 rounded-lg hover:bg-orange-50 transition-smooth"
      >
        <FiPlus /> {addLabel}
      </button>
      {withBullets && (
        <p className="text-[11px] text-gray-400">
          Weak bullet? Polish it in the <Link to="/resume" className="text-orange-700 underline">Bullet Rewriter</Link> tab of Resume Analyzer.
        </p>
      )}
    </div>
  );
};

export const LinesField = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea rows={rows} className={INPUT} value={toLines(value)} onChange={(e) => onChange(fromLines(e.target.value))} placeholder={placeholder} />
);
