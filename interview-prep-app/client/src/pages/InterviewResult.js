import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  FiThumbsUp, FiTrendingUp, FiRefreshCw, FiBarChart2, FiMap, FiCheckCircle,
  FiAlertTriangle, FiTarget, FiZap, FiMic, FiBookOpen, FiCode, FiMessageCircle, FiStar
} from 'react-icons/fi';
import { interviewAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';
import { ScoreBar, scoreTone } from '../components/ScoreRing';

const DIMENSIONS = [
  { key: 'technicalAccuracy', label: 'Technical', color: '#f97316' },
  { key: 'communication', label: 'Communication', color: '#8b5cf6' },
  { key: 'confidence', label: 'Confidence', color: '#3b82f6' },
  { key: 'structure', label: 'Structure', color: '#f59e0b' },
  { key: 'relevance', label: 'Relevance', color: '#14b8a6' },
  { key: 'problemSolving', label: 'Problem Solving', color: '#f43f5e' },
];

const PRACTICE_ICONS = [
  { icon: FiZap, tint: 'bg-amber-50 text-amber-500' },
  { icon: FiTarget, tint: 'bg-rose-50 text-rose-500' },
  { icon: FiMic, tint: 'bg-sky-50 text-sky-500' },
  { icon: FiBookOpen, tint: 'bg-violet-50 text-violet-500' },
  { icon: FiCode, tint: 'bg-emerald-50 text-emerald-500' },
  { icon: FiStar, tint: 'bg-orange-50 text-orange-500' },
];

const verdictFor = (score) => {
  if (score >= 80) return "Excellent — you're interview-ready";
  if (score >= 65) return 'Good — mostly ready, a few areas to improve';
  if (score >= 50) return 'Fair — keep practicing the weak spots';
  return 'Needs work — focus on the basics first';
};

const Card = ({ title, icon: Icon, children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={`card p-5 ${className}`}
  >
    {title && (
      <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4 font-display">
        {Icon && <Icon size={16} className="text-orange-600" />}
        {title}
      </h3>
    )}
    {children}
  </motion.div>
);

const BigScoreRing = ({ score }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#e0f2fe" strokeWidth="12" />
        <motion.circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-5xl font-bold text-orange-600 font-display">{score}%</span>
      </div>
    </div>
  );
};

const InsightRow = ({ icon: Icon, tint, title, text }) => (
  <div className="flex gap-3">
    <Icon size={18} className={`${tint} flex-shrink-0 mt-0.5`} />
    <div>
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <p className="text-sm text-gray-600 leading-snug">{text}</p>
    </div>
  </div>
);

const ListSection = ({ title, icon: Icon, items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
        <Icon size={16} className="text-orange-600" />
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-600 pl-1">• {item}</li>
        ))}
      </ul>
    </div>
  );
};

const InterviewResult = () => {
  const { interviewId } = useParams();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadInterview = useCallback(async () => {
    try {
      const response = await interviewAPI.getById(interviewId);
      setInterview(response.data);
    } catch (error) {
      console.error('Error loading interview result:', error);
      showToast('Unable to load this interview result', 'error');
    } finally {
      setLoading(false);
    }
  }, [interviewId, showToast]);

  useEffect(() => {
    loadInterview();
  }, [loadInterview]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!interview || !interview.result) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto card p-8 md:p-10 text-center">
          <h3 className="text-xl font-bold text-gray-800 mb-2 font-display">Result Not Available</h3>
          <p className="text-gray-600">This interview doesn't have a result yet.</p>
        </div>
      </div>
    );
  }

  const { result, config, turns = [] } = interview;
  const answered = turns.filter((t) => t.evaluation).length;
  const skipped = turns.filter((t) => t.skipped).length;
  const minutes = interview.completedAt
    ? Math.max(1, Math.round((new Date(interview.completedAt) - new Date(interview.startedAt)) / 60000))
    : null;

  // Each slice's size is that skill's share of the total, like a contribution chart.
  const breakdown = DIMENSIONS.map((d) => ({ ...d, value: result[d.key] || 0 }));
  const breakdownTotal = breakdown.reduce((sum, d) => sum + d.value, 0);

  const communicationScore = Math.round((result.communication + result.structure + result.confidence) / 3);
  const communicationTone = scoreTone(communicationScore);

  const insights = [
    result.strengths?.[0] && { icon: FiCheckCircle, tint: 'text-emerald-500', title: 'Strength Insight', text: result.strengths[0] },
    result.improvements?.[0] && { icon: FiAlertTriangle, tint: 'text-amber-500', title: 'Improvement', text: result.improvements[0] },
    result.recommendedPractice?.[0] && { icon: FiTarget, tint: 'text-rose-500', title: 'Actionable Recommendation', text: result.recommendedPractice[0] },
  ].filter(Boolean);

  const practiceTopic = (topic) => {
    navigate('/mock-interview', {
      state: {
        source: 'result',
        difficulty: config.difficulty,
        jobContext: { title: config.role, skills: [], topics: [topic] },
      },
    });
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-2 font-display">
            Interview Result
          </h1>
          <p className="text-zinc-600">
            {config.interviewType} interview for {config.role} · {config.difficulty} difficulty
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: score, breakdown, communication */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card title="AI Interview Score" className="text-center">
                <BigScoreRing score={result.overallScore} />
                <p className={`text-sm font-semibold mt-4 ${scoreTone(result.overallScore).text}`}>
                  {verdictFor(result.overallScore)}
                </p>
                <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-lg font-bold text-gray-800 font-display">{answered}</p>
                    <p className="text-[11px] text-gray-500">Answered</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800 font-display">{skipped}</p>
                    <p className="text-[11px] text-gray-500">Skipped</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800 font-display">{minutes ?? '-'}</p>
                    <p className="text-[11px] text-gray-500">Minutes</p>
                  </div>
                </div>
              </Card>

              <Card title="AI Score Breakdown">
                <div className="relative" style={{ height: 180 }}>
                  {breakdownTotal > 0 ? (
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={breakdown}
                          dataKey="value"
                          nameKey="label"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          cornerRadius={6}
                          stroke="none"
                          isAnimationActive
                        >
                          {breakdown.map((d) => <Cell key={d.key} fill={d.color} />)}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} / 100`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-gray-400">No scored answers</div>
                  )}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-400">6 skills</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
                  {breakdown.map((d) => (
                    <div key={d.key} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-gray-600 truncate">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        {d.label}
                      </span>
                      <span className="font-semibold text-gray-800">{d.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card title="How Your Communication Went" icon={FiMessageCircle}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="sm:w-40 flex-shrink-0">
                  <p className="text-4xl font-bold text-gray-800 font-display">{communicationScore}%</p>
                  <p className={`text-sm font-semibold ${communicationTone.text}`}>{communicationTone.label}</p>
                  <p className="text-xs text-gray-500 mt-1">How clearly, confidently and in what order you answered</p>
                </div>
                <div className="flex-1 grid gap-3">
                  <ScoreBar label="Clarity" score={result.communication} icon={FiMessageCircle} />
                  <ScoreBar label="Answer Structure" score={result.structure} icon={FiBookOpen} />
                  <ScoreBar label="Confidence" score={result.confidence} icon={FiMic} />
                </div>
              </div>
            </Card>
          </div>

          {/* Right: practice recommendations and insights */}
          <div className="space-y-6">
            {result.recommendedTopics?.length > 0 && (
              <Card title="Practice Recommendation" icon={FiZap}>
                <div className="grid grid-cols-2 gap-3">
                  {result.recommendedTopics.slice(0, 4).map((topic, i) => {
                    const { icon: Icon, tint } = PRACTICE_ICONS[i % PRACTICE_ICONS.length];
                    return (
                      <motion.button
                        key={topic}
                        type="button"
                        whileHover={{ y: -3 }}
                        onClick={() => practiceTopic(topic)}
                        title={`Practice ${topic} in a mock interview`}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <span className={`w-12 h-12 rounded-xl flex items-center justify-center ${tint}`}>
                          <Icon size={24} />
                        </span>
                        <span className="text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2">{topic}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-400 mt-3 text-center">Tap a topic to practice it in a mock interview</p>
              </Card>
            )}

            {insights.length > 0 && (
              <Card title="AI Insights" icon={FiStar}>
                <div className="space-y-4">
                  {insights.map((insight) => <InsightRow key={insight.title} {...insight} />)}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Full feedback */}
        <Card className="grid md:grid-cols-2 gap-6">
          <ListSection title="What You Did Well" icon={FiThumbsUp} items={result.strengths} />
          <ListSection title="What To Improve" icon={FiTrendingUp} items={result.improvements} />
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-center gap-3">
          <button
            onClick={() => navigate('/mock-interview')}
            className="btn-primary"
          >
            <FiRefreshCw />
            <span>Practice Again</span>
          </button>
          <button
            onClick={() => navigate('/analytics')}
            className="btn-secondary"
          >
            <FiBarChart2 />
            <span>View Analytics</span>
          </button>
          <button
            onClick={() => navigate('/roadmap')}
            className="btn-secondary"
          >
            <FiMap />
            <span>Learning Roadmap</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewResult;
