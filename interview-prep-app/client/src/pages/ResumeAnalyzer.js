import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiUpload, FiFile, FiCheckCircle, FiAlertTriangle, FiLoader,
  FiAward, FiTarget, FiBriefcase, FiBookOpen, FiTrendingUp, FiThumbsUp,
  FiBarChart2, FiShield, FiEdit3
} from 'react-icons/fi';
import { resumeAPI, profileAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';
import AddJobModal from '../components/AddJobModal';
import AtsScanTab from '../components/resume/AtsScanTab';
import BulletRewriterTab from '../components/resume/BulletRewriterTab';

const TABS = [
  { id: 'analysis', label: 'Analysis', icon: FiBarChart2 },
  { id: 'ats', label: 'ATS Scan', icon: FiShield },
  { id: 'rewriter', label: 'Bullet Rewriter', icon: FiEdit3 },
];

const SkillPill = ({ label, tone }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
      tone === 'good'
        ? 'bg-green-50 text-green-700'
        : tone === 'warn'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-gray-100 text-gray-700'
    }`}
  >
    {tone === 'good' && <FiCheckCircle size={12} />}
    {tone === 'warn' && <FiAlertTriangle size={12} />}
    {label}
  </span>
);

const ListSection = ({ title, icon: Icon, items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
        <Icon size={16} className="text-cyan-600" />
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

const ResumeAnalyzer = () => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [creatingInterview, setCreatingInterview] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadExisting = useCallback(async () => {
    try {
      const response = await resumeAPI.getMine();
      setAnalysis(response.data.analysis);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error loading resume analysis:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('Please select a PDF file', 'error');
      return;
    }

    setSelectedFile(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    try {
      const response = await resumeAPI.upload(selectedFile);
      setAnalysis(response.data.analysis);
      showToast('Resume analyzed successfully', 'success');
    } catch (error) {
      console.error('Error analyzing resume:', error);
      const message = error.response?.data?.message || 'Failed to analyze resume. Please try again.';
      showToast(message, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateInterview = async (formData) => {
    setCreatingInterview(true);
    try {
      const response = await profileAPI.create(formData);
      setShowInterviewModal(false);
      showToast('Interview questions are being generated', 'success');
      navigate(`/interview/${response.data._id}`, { state: { profile: response.data } });
    } catch (error) {
      console.error('Error creating interview:', error);
      showToast('Failed to start interview. Please try again.', 'error');
    } finally {
      setCreatingInterview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="spinner"></div>
      </div>
    );
  }

  const showScore = !analyzing && !!analysis;
  // The two side-by-side cards share a title, content height and button so they line up.
  const CARD_TITLE = 'text-sm font-semibold text-gray-800 font-display mb-3';
  const ACTION_BTN = 'flex items-center justify-center gap-2 px-6 h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg hover:shadow-xl transition-smooth';

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-display">
            Resume Analyzer
          </h1>
          <p className="text-slate-300">
            Upload your resume and let AI find your strengths, gaps, and interview focus areas
          </p>
        </motion.div>

        <div className="flex gap-1 p-1 mb-6 bg-white/10 border border-white/15 rounded-xl overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-smooth ${
                activeTab === id ? 'bg-white text-slate-900 shadow' : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'ats' && <AtsScanTab hasResume={!!analysis} suggestedRole={analysis?.suggestedRole} />}
        {activeTab === 'rewriter' && <BulletRewriterTab suggestedRole={analysis?.suggestedRole} />}

        {activeTab === 'analysis' && (
        <>

        <div className={`grid gap-6 mb-6 ${showScore ? 'lg:grid-cols-2' : ''}`}>
        {/* Upload Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-6 flex flex-col"
        >
          {showScore && <p className={CARD_TITLE}>Upload a new version</p>}
          <div className={`flex-1 flex flex-col items-stretch gap-4 ${showScore ? '' : 'sm:flex-row sm:items-center'}`}>
            <label className={`min-w-0 flex items-center gap-3 border-2 border-dashed border-gray-300 rounded-xl px-4 cursor-pointer hover:border-cyan-400 transition-smooth ${showScore ? 'min-h-[4.5rem]' : 'flex-1 py-4'}`}>
              <FiFile className="text-gray-400 flex-shrink-0" size={22} />
              <span className="text-sm text-gray-600 truncate">
                {selectedFile ? selectedFile.name : 'Choose a PDF resume to upload'}
              </span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <button
              onClick={handleAnalyze}
              disabled={!selectedFile || analyzing}
              className={`${ACTION_BTN} flex-shrink-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${showScore ? 'mt-auto' : ''}`}
            >
              {analyzing ? (
                <>
                  <FiLoader className="animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <FiUpload />
                  <span>Analyze Resume</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

          {/* Score, next to the upload card on wide screens */}
          {showScore && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl p-6 flex flex-col"
            >
              <p className={CARD_TITLE}>Your result</p>
              <div className="min-h-[4.5rem] flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                    <FiAward size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Resume Score</p>
                    <p className="text-3xl font-bold text-gray-800 font-display">{analysis.score}%</p>
                  </div>
                </div>

                {analysis.suggestedRole && (
                  <div className="flex items-center gap-3 bg-cyan-50 px-4 py-2.5 rounded-xl">
                    <FiTarget className="text-cyan-600 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-xs text-gray-500">Suggested Role</p>
                      <p className="text-sm font-semibold text-gray-800">{analysis.suggestedRole}</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowInterviewModal(true)}
                className={`${ACTION_BTN} w-full mt-auto`}
              >
                <FiBriefcase />
                <span>Generate Interview From Resume</span>
              </button>
            </motion.div>
          )}
        </div>

        {/* Analyzing state */}
        {analyzing && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <FiLoader className="animate-spin text-cyan-600 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-bold text-gray-800 mb-2 font-display">
              AI is analyzing your resume...
            </h3>
            <p className="text-gray-600">This can take a few seconds</p>
          </div>
        )}

        {/* Empty state */}
        {!analyzing && !analysis && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="w-24 h-24 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiFile size={40} className="text-cyan-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3 font-display">
              No Resume Analyzed Yet
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Upload a PDF resume above to get your score, detected skills, and personalized interview prep suggestions
            </p>
          </div>
        )}

        {/* Results */}
        {!analyzing && analysis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Skills */}
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4 font-display">Skills</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Found</p>
                  <div className="flex flex-wrap gap-2">
                    {[...(analysis.technicalSkills || []), ...(analysis.softSkills || [])].map((skill, i) => (
                      <SkillPill key={i} label={skill} tone="good" />
                    ))}
                    {(analysis.technicalSkills?.length || 0) + (analysis.softSkills?.length || 0) === 0 && (
                      <p className="text-sm text-gray-400">No skills detected</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Missing / Weak</p>
                  <div className="flex flex-wrap gap-2">
                    {(analysis.missingSkills || []).map((skill, i) => (
                      <SkillPill key={i} label={skill} tone="warn" />
                    ))}
                    {(!analysis.missingSkills || analysis.missingSkills.length === 0) && (
                      <p className="text-sm text-gray-400">None identified</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 grid md:grid-cols-2 gap-6">
              <ListSection title="Projects" icon={FiBookOpen} items={analysis.projects} />
              <ListSection title="Experience" icon={FiBriefcase} items={analysis.experience} />
              <ListSection title="Education" icon={FiAward} items={analysis.education} />
              <ListSection title="Strengths" icon={FiThumbsUp} items={analysis.strengths} />
            </div>

            {analysis.improvements?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <FiTrendingUp size={16} className="text-cyan-600" />
                  Improvement Suggestions
                </h4>
                <ul className="space-y-1.5">
                  {analysis.improvements.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 pl-1">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
        </>
        )}
      </div>

      {showInterviewModal && (
        <AddJobModal
          onClose={() => setShowInterviewModal(false)}
          onSubmit={handleGenerateInterview}
          loading={creatingInterview}
          title="Generate Interview From Resume"
          initialData={{
            targetRole: analysis?.suggestedRole || '',
            topics: (analysis?.suggestedTopics || []).map((t) => t.replace(/,/g, '')).join(', '),
          }}
        />
      )}
    </div>
  );
};

export default ResumeAnalyzer;
