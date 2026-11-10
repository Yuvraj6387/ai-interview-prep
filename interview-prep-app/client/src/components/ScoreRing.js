import React from 'react';

// Shared by Job Matcher and the ATS scan, so both score screens look the same.
export const scoreTone = (score) => {
  if (score >= 75) return { ring: '#059669', text: 'text-emerald-600', bar: 'bg-emerald-500', label: 'Strong' };
  if (score >= 50) return { ring: '#d97706', text: 'text-amber-600', bar: 'bg-amber-500', label: 'Needs work' };
  return { ring: '#dc2626', text: 'text-red-600', bar: 'bg-red-500', label: 'Weak' };
};

const ScoreRing = ({ score, label }) => {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(score);

  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={tone.ring}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-800 font-display">{score}%</span>
        <span className={`text-[11px] font-semibold ${tone.text}`}>{label || tone.label}</span>
      </div>
    </div>
  );
};

// A labelled 0-100 score with a thin bar, used for the per-section scores.
export const ScoreBar = ({ label, score, icon: Icon }) => {
  const tone = scoreTone(score);
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {Icon && <Icon size={16} className="text-orange-600" />}
          {label}
        </span>
        <span className="text-sm">
          <span className={`font-bold ${tone.text}`}>{score}</span>
          <span className="text-gray-400"> / 100</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${score}%`, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
};

export default ScoreRing;
