import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiTarget, FiLoader, FiCheckCircle, FiAlertTriangle, FiTrendingUp,
  FiMic, FiFileText, FiArrowRight, FiTag, FiBriefcase, FiAward, FiClipboard,
  FiBookOpen, FiCode, FiExternalLink
} from 'react-icons/fi';
import { resumeAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';
import ScoreRing, { ScoreBar } from '../components/ScoreRing';
import SkillGapCard from '../components/SkillGapCard';

const MIN_LENGTH = 100;
const MAX_LENGTH = 5000;

const matchLabel = (score) => (score >= 75 ? 'Strong match' : score >= 50 ? 'Partial match' : 'Weak match');

const SECTION_ROWS = [
  { key: 'keywords', label: 'Keywords match', icon: FiTag },
  { key: 'jobTitle', label: 'Job title match', icon: FiBriefcase },
  { key: 'qualifications', label: 'Qualifications match', icon: FiAward },
  { key: 'responsibilities', label: 'Responsibilities match', icon: FiClipboard },
];

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
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-md shadow-cyan-600/20 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {matching ? <FiLoader className="animate-spin" /> : <FiTarget />}
              <span>{matching ? 'Matching your resume...' : 'Check Match'}</span>
            </button>
          </div>
        </motion.form>

        {match && !matching && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-5 md:p-6 flex flex-col md:flex-row items-center gap-5">
              <ScoreRing score={match.matchScore} label={matchLabel(match.matchScore)} />
              <div className="flex-1 text-center md:text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Resume match for</p>
                <h2 className="text-xl font-bold text-gray-800 font-display mb-1">{match.jobTitle || 'This job'}</h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-3">{match.summary}</p>
                <button
                  onClick={startInterview}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-md shadow-cyan-600/20 transition-smooth"
                >
                  <FiMic />
                  <span>Start Mock Interview for this Job</span>
                </button>
              </div>
            </div>

            {match.sectionScores && (
              <div className="grid sm:grid-cols-2 gap-3">
                {SECTION_ROWS.map(({ key, label, icon }) => (
                  <ScoreBar key={key} label={label} icon={icon} score={match.sectionScores[key]} />
                ))}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <SkillList title="Skills you have" icon={FiCheckCircle} items={match.matchedSkills} tone="good" />
              <SkillList title="Skills to work on" icon={FiAlertTriangle} items={match.missingSkills} tone="warn" />
            </div>

            {match.experienceGaps?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <FiBriefcase size={16} className="text-amber-600" />
                  Experience gaps
                </h3>
                <ul className="space-y-2">
                  {match.experienceGaps.map((gap) => (
                    <li key={gap} className="flex gap-2 text-sm text-gray-600">
                      <FiAlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <SkillGapCard skills={match.skillGap} />

            {match.learningPlan?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800 font-display mb-1">
                  <FiBookOpen className="text-cyan-600" />
                  How to close your biggest gaps
                </h3>
                <p className="text-sm text-gray-500 mb-5">What to study, and a small project that proves the skill</p>
                <div className="grid md:grid-cols-3 gap-4">
                  {match.learningPlan.map((plan) => (
                    <div key={plan.skill} className="bg-cyan-50/60 border border-cyan-100 rounded-xl p-4 flex flex-col gap-3">
                      <p className="font-semibold text-gray-800">{plan.skill}</p>
                      {plan.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {plan.topics.map((topic) => (
                            <span key={topic} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white text-cyan-700 border border-cyan-100">
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                      {plan.project && (
                        <p className="flex gap-2 text-sm text-gray-600">
                          <FiCode size={14} className="text-cyan-600 mt-0.5 flex-shrink-0" />
                          <span><span className="font-semibold text-gray-700">Build: </span>{plan.project}</span>
                        </p>
                      )}
                      {plan.resource && (
                        <p className="flex gap-2 text-sm text-gray-600">
                          <FiExternalLink size={14} className="text-cyan-600 mt-0.5 flex-shrink-0" />
                          <span><span className="font-semibold text-gray-700">Learn: </span>{plan.resource}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
