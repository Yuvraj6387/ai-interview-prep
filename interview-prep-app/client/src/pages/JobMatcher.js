import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiTarget, FiLoader, FiCheckCircle, FiAlertTriangle, FiTrendingUp,
  FiMic, FiFileText, FiArrowRight, FiTag
} from 'react-icons/fi';
import { resumeAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';

const MIN_LENGTH = 100;
const MAX_LENGTH = 5000;

const scoreTone = (score) => {
  if (score >= 75) return { ring: '#059669', text: 'text-emerald-600', label: 'Strong match' };
  if (score >= 50) return { ring: '#d97706', text: 'text-amber-600', label: 'Partial match' };
  return { ring: '#dc2626', text: 'text-red-600', label: 'Weak match' };
};

const ScoreRing = ({ score }) => {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(score);

  return (
    <div className="relative w-36 h-36 flex-shrink-0">
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
        <span className="text-3xl font-bold text-gray-800 font-display">{score}%</span>
        <span className={`text-xs font-semibold ${tone.text}`}>{tone.label}</span>
      </div>
    </div>
  );
};

const SkillList = ({ title, icon: Icon, items, tone }) => (
  <div className="bg-white rounded-2xl shadow-xl p-6">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
      <Icon size={16} className={tone === 'good' ? 'text-emerald-600' : 'text-amber-600'} />
      {title}
      <span className="text-gray-400 font-normal">({items.length})</span>
    </h3>
    {items.length === 0 ? (
      <p className="text-sm text-gray-400">None found</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {items.map((skill) => (
          <span
            key={skill}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              tone === 'good' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {skill}
          </span>
        ))}
      </div>
    )}
  </div>
);

const JobMatcher = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [matching, setMatching] = useState(false);
  const [match, setMatch] = useState(null);
  const [hasResume, setHasResume] = useState(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    resumeAPI.getMine()
      .then(() => setHasResume(true))
      .catch(() => setHasResume(false));
  }, []);

  const handleMatch = async (e) => {
    e.preventDefault();
    if (jobDescription.trim().length < MIN_LENGTH) {
      showToast(`Please paste the full job description (at least ${MIN_LENGTH} characters)`, 'error');
      return;
    }

    setMatching(true);
    try {
      const response = await resumeAPI.match(jobDescription);
      setMatch(response.data);
    } catch (error) {
      console.error('Error matching resume:', error);
      showToast(error.response?.data?.message || 'Failed to match your resume. Please try again.', 'error');
    } finally {
      setMatching(false);
    }
  };

  // The interview page reads this and asks questions aimed at this job.
  const startInterview = () => {
    navigate('/mock-interview', {
      state: {
        jobContext: {
          title: match.jobTitle,
          skills: [...match.missingSkills, ...match.matchedSkills],
          topics: match.interviewTopics,
        },
      },
    });
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-display">Job Matcher</h1>
          <p className="text-slate-300">
            Paste a job description to see how well your resume fits it, then practise an interview for that exact job
          </p>
        </motion.div>

        {hasResume === false && (
          <Link
            to="/resume"
            className="flex items-center gap-2 text-sm text-slate-200 bg-white/10 border border-white/20 hover:bg-white/15 rounded-lg px-4 py-2.5 transition-smooth"
          >
            <FiFileText size={16} className="flex-shrink-0" />
            <span>Upload your resume in Resume Analyzer first — the matcher compares the job against it</span>
            <FiArrowRight size={14} className="ml-auto flex-shrink-0" />
          </Link>
        )}

        <motion.form
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          onSubmit={handleMatch}
          className="bg-white rounded-2xl shadow-xl p-5 md:p-6"
        >
          <label className="block text-sm font-semibold text-gray-700 mb-2">Job Description</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value.slice(0, MAX_LENGTH))}
            rows="8"
            className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth resize-y"
            placeholder="Paste the job description here — responsibilities, required skills, experience..."
            disabled={matching}
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
            <span className="text-xs text-gray-400">
              {jobDescription.length} / {MAX_LENGTH} characters
            </span>
            <button
              type="submit"
              disabled={matching || hasResume === false}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-600/30 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {matching ? <FiLoader className="animate-spin" /> : <FiTarget />}
              <span>{matching ? 'Matching your resume...' : 'Check Match'}</span>
            </button>
          </div>
        </motion.form>

        {match && !matching && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
              <ScoreRing score={match.matchScore} />
              <div className="flex-1 text-center md:text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Resume match for</p>
                <h2 className="text-2xl font-bold text-gray-800 font-display mb-2">{match.jobTitle || 'This job'}</h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">{match.summary}</p>
                <button
                  onClick={startInterview}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-600/30 transition-smooth"
                >
                  <FiMic />
                  <span>Start Mock Interview for this Job</span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <SkillList title="Skills you have" icon={FiCheckCircle} items={match.matchedSkills} tone="good" />
              <SkillList title="Skills to work on" icon={FiAlertTriangle} items={match.missingSkills} tone="warn" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {match.suggestions.length > 0 && (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <FiTrendingUp size={16} className="text-cyan-600" />
                    How to close the gap
                  </h3>
                  <ul className="space-y-2">
                    {match.suggestions.map((tip) => (
                      <li key={tip} className="flex gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {match.interviewTopics.length > 0 && (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <FiTag size={16} className="text-cyan-600" />
                    Likely interview topics
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {match.interviewTopics.map((topic) => (
                      <span key={topic} className="px-3 py-1.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default JobMatcher;
