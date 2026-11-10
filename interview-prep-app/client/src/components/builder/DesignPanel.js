import React from 'react';
import { FiCheck } from 'react-icons/fi';
import { TEMPLATES } from './ResumePreview';

export const COLORS = [
  { name: 'Cyan', value: '#0e7490' },
  { name: 'Blue', value: '#1d4ed8' },
  { name: 'Indigo', value: '#4338ca' },
  { name: 'Emerald', value: '#047857' },
  { name: 'Rose', value: '#be123c' },
  { name: 'Orange', value: '#c2410c' },
  { name: 'Slate', value: '#334155' },
  { name: 'Black', value: '#111827' },
];

// A tiny sketch of each template (header + a couple of headings and lines),
// drawn in the chosen colour, so the choice is visual rather than just a name.
const Thumbnail = ({ id, accent }) => {
  const line = (w, color = '#d1d5db') => <div style={{ height: 2, width: w, background: color, borderRadius: 1, marginTop: 2 }} />;
  const heading = {
    classic: <div style={{ borderBottom: `1px solid ${accent}`, height: 4, width: '45%' }} />,
    modern: <div style={{ borderBottom: `1px solid ${accent}55`, height: 4, width: '45%', borderTop: `2px solid ${accent}` }} />,
    minimal: line('35%', accent),
    elegant: <div style={{ borderBottom: `1px solid ${accent}`, height: 4, width: '50%', margin: '0 auto' }} />,
    compact: <div style={{ background: `${accent}33`, height: 4, width: '100%' }} />,
    bold: <div style={{ borderBottom: `2px solid ${accent}`, height: 4, width: '45%' }} />,
  }[id];
  const header = {
    classic: <div style={{ textAlign: 'center' }}><div style={{ height: 4, width: '50%', background: '#111827', margin: '0 auto' }} /></div>,
    modern: <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 3 }}><div style={{ height: 4, width: '55%', background: '#111827' }} />{line('35%', accent)}</div>,
    minimal: <div><div style={{ height: 4, width: '55%', background: accent, opacity: 0.8 }} /></div>,
    elegant: <div style={{ borderBottom: `2px double ${accent}`, paddingBottom: 2 }}><div style={{ height: 4, width: '50%', background: '#111827', margin: '0 auto' }} /></div>,
    compact: <div><div style={{ height: 3, width: '45%', background: '#111827' }} />{line('30%', accent)}</div>,
    bold: <div style={{ background: accent, padding: 3, borderRadius: 2 }}><div style={{ height: 4, width: '55%', background: '#fff' }} /></div>,
  }[id];

  return (
    <div className="bg-white rounded border border-gray-200 p-1.5 h-16 overflow-hidden">
      {header}
      <div style={{ marginTop: 4 }}>{heading}</div>
      {line('90%')}{line('75%')}
      <div style={{ marginTop: 3 }}>{heading}</div>
      {line('85%')}
    </div>
  );
};

const DesignPanel = ({ template, accentColor, onTemplate, onColor }) => {
  const isPreset = COLORS.some((c) => c.value.toLowerCase() === accentColor.toLowerCase());

  return (
    <div className="card p-4 md:p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">Template</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Object.entries(TEMPLATES).map(([id, { label }]) => (
            <button
              key={id}
              type="button"
              onClick={() => onTemplate(id)}
              className={`rounded-lg p-1.5 text-left border-2 transition-smooth ${template === id ? 'border-orange-600 bg-orange-50' : 'border-transparent hover:bg-gray-50'}`}
            >
              <Thumbnail id={id} accent={accentColor} />
              <p className={`text-xs font-semibold mt-1 text-center ${template === id ? 'text-orange-700' : 'text-gray-600'}`}>{label}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">Color</p>
        <div className="flex flex-wrap items-center gap-2">
          {COLORS.map(({ name, value }) => {
            const selected = value.toLowerCase() === accentColor.toLowerCase();
            return (
              <button
                key={value}
                type="button"
                title={name}
                aria-label={name}
                onClick={() => onColor(value)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${selected ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                style={{ background: value }}
              >
                {selected && <FiCheck size={14} className="text-white" />}
              </button>
            );
          })}
          <label
            title="Custom color"
            className={`relative h-7 px-2.5 rounded-full border border-gray-300 flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer hover:border-orange-400 ${isPreset ? '' : 'ring-2 ring-offset-2 ring-gray-400'}`}
          >
            <span className="w-3.5 h-3.5 rounded-full border border-gray-200" style={{ background: accentColor }} />
            Custom
            <input
              type="color"
              value={accentColor}
              onChange={(e) => onColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Used for your name, headings and lines. Body text stays dark so it reads well when printed.</p>
      </div>
    </div>
  );
};

export default DesignPanel;
