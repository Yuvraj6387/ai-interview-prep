import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Tooltip, ResponsiveContainer,
} from 'recharts';
import { FiCrosshair } from 'react-icons/fi';

// A skill counts as a critical gap when the resume is 25+ points below what the job needs.
const CRITICAL_GAP = 25;

const statusOf = ({ current, target }) => {
  const gap = target - current;
  if (gap <= 0) return { label: 'meets', className: 'bg-green-50 text-green-700' };
  if (gap >= CRITICAL_GAP) return { label: 'critical', className: 'bg-red-50 text-red-700' };
  return { label: 'below', className: 'bg-amber-50 text-amber-700' };
};

const StatTile = ({ value, label, hint, className }) => (
  <div className={`rounded-xl border px-3 py-3 text-center ${className}`}>
    <p className="text-2xl font-bold font-display">{value}</p>
    <p className="text-xs font-semibold">{label}</p>
    <p className="text-[11px] opacity-75">{hint}</p>
  </div>
);

const SkillGapCard = ({ skills }) => {
  if (!skills || skills.length === 0) return null;

  const gaps = skills.map((s) => Math.max(0, s.target - s.current));
  const averageGap = Math.round(gaps.reduce((sum, g) => sum + g, 0) / skills.length);
  const critical = gaps.filter((g) => g >= CRITICAL_GAP).length;
  const strengths = skills.filter((s) => s.current >= s.target).length;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
      <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800 font-display">
        <FiCrosshair className="text-cyan-600" />
        Skill Gap Analysis
      </h3>
      <p className="text-sm text-gray-500 mb-5">Your current level, read from your resume, against what this job needs</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatTile value={averageGap} label="Average gap" hint="points per skill" className="bg-amber-50 border-amber-100 text-amber-700" />
        <StatTile value={critical} label="Critical gaps" hint="need attention first" className="bg-red-50 border-red-100 text-red-700" />
        <StatTile value={strengths} label="Strengths" hint="meet the bar" className="bg-green-50 border-green-100 text-green-700" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-center">
        <div className="h-72 bg-slate-50 rounded-xl">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={skills} outerRadius="70%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#475569' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Job needs" dataKey="target" stroke="#64748b" strokeDasharray="4 3" fill="#64748b" fillOpacity={0.08} />
              <Radar name="Your level" dataKey="current" stroke="#0891b2" fill="#06b6d4" fillOpacity={0.3} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {skills.map((s) => {
            const status = statusOf(s);
            return (
              <div key={s.skill} className="border border-gray-100 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-700 truncate">{s.skill}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                </div>
                <div className="relative h-2 bg-gray-100 rounded-full">
                  <div className="absolute inset-y-0 left-0 bg-cyan-500 rounded-full" style={{ width: `${s.current}%` }} />
                  {/* Marker for the level the job needs */}
                  <div className="absolute -top-1 -bottom-1 w-0.5 bg-slate-700" style={{ left: `${s.target}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                  <span>You: {s.current}%</span>
                  <span>Needed: {s.target}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SkillGapCard;
