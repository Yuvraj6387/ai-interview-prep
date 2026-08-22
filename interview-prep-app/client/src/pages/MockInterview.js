import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBriefcase, FiAward, FiLayers, FiTrendingUp, FiHash, FiLoader,
  FiClock, FiSkipForward, FiXCircle, FiSend, FiMessageCircle, FiZap, FiUser,
  FiCheckCircle, FiFileText, FiArrowRight
} from 'react-icons/fi';
import { interviewAPI, resumeAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';

const INTERVIEW_TYPES = ['Technical', 'HR', 'Behavioral', 'Full Stack', 'Coding'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const QUESTION_COUNTS = [3, 5, 7, 10];

const formatElapsed = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const MockInterview = () => {
  const [config, setConfig] = useState({
    role: '',
    experienceLevel: '',
    interviewType: 'Technical',
    difficulty: 'Medium',
    numQuestions: 5,
  });
  const [starting, setStarting] = useState(false);
  const [interview, setInterview] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [submitAction, setSubmitAction] = useState(null); // null | 'answer' | 'skip'
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [resume, setResume] = useState(null);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const bottomRef = useRef(null);

  const currentTurn = interview?.turns?.[interview.turns.length - 1];
  const pastTurns = interview?.turns?.slice(0, -1) || [];

  useEffect(() => {
    resumeAPI.getMine()
      .then((response) => {
        setResume(response.data.analysis);
        setConfig((prev) => (prev.role ? prev : { ...prev, role: response.data.analysis.suggestedRole || '' }));
      })
      .catch(() => setResume(null));
  }, []);

  useEffect(() => {
    if (!interview) return undefined;

    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [interview?.turns?.length, interview]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [interview?.turns?.length]);

  const handleConfigChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleStart = async (e) => {
    e.preventDefault();
    setStarting(true);
    try {
      const response = await interviewAPI.start({
        ...config,
        experienceLevel: parseInt(config.experienceLevel, 10),
        numQuestions: parseInt(config.numQuestions, 10),
      });
      setInterview(response.data);
    } catch (error) {
      console.error('Error starting interview:', error);
      const message = error.response?.data?.message || 'Failed to start interview. Please try again.';
      showToast(message, 'error');
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitAnswer = async (skip = false) => {
    if (!skip && !answerText.trim()) {
      showToast('Please enter an answer, or use Skip Question', 'error');
      return;
    }

    setSubmitAction(skip ? 'skip' : 'answer');
    try {
      const response = await interviewAPI.submitAnswer(
        interview._id,
        skip ? { skip: true } : { answerText }
      );

      if (response.data.completed) {
        showToast('Interview complete!', 'success');
        navigate(`/interview-result/${interview._id}`);
        return;
      }

      setInterview(response.data.interview);
      setAnswerText('');
    } catch (error) {
      console.error('Error submitting answer:', error);
      const message = error.response?.data?.message || 'Failed to submit answer. Please try again.';
      showToast(message, 'error');
    } finally {
      setSubmitAction(null);
    }
  };

  const handleEndInterview = async () => {
    if (!window.confirm('End this interview now? Your result will be based on the questions answered so far.')) {
      return;
    }

    setEnding(true);
    try {
      await interviewAPI.end(interview._id);
      navigate(`/interview-result/${interview._id}`);
    } catch (error) {
      console.error('Error ending interview:', error);
      showToast('Failed to end interview. Please try again.', 'error');
    } finally {
      setEnding(false);
    }
  };

  if (!interview) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-display">
              Mock Interview
            </h1>
            <p className="text-slate-300">
              AI asks, evaluates, and adapts its next question based on how you answer
            </p>
          </motion.div>

          {resume ? (
            <div className="flex items-center gap-2 text-sm text-cyan-300 bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 mb-4">
              <FiCheckCircle size={16} className="flex-shrink-0" />
              <span>Personalized using your resume — questions will be grounded in your actual skills and projects.</span>
            </div>
          ) : (
            <Link
              to="/resume"
              className="flex items-center gap-2 text-sm text-slate-200 bg-white/10 border border-white/20 hover:bg-white/15 rounded-lg px-4 py-2.5 mb-4 transition-smooth"
            >
              <FiFileText size={16} className="flex-shrink-0" />
              <span>Upload your resume for a personalized interview instead of generic questions</span>
              <FiArrowRight size={14} className="ml-auto flex-shrink-0" />
            </Link>
          )}

          <motion.form
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={handleStart}
            className="bg-white rounded-xl shadow-xl p-5 md:p-6 space-y-4"
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Role *</label>
                <div className="relative">
                  <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    name="role"
                    value={config.role}
                    onChange={handleConfigChange}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth"
                    placeholder="e.g., Full Stack Developer"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Years *</label>
                <div className="relative">
                  <FiAward className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="number"
                    name="experienceLevel"
                    value={config.experienceLevel}
                    onChange={handleConfigChange}
                    min="0"
                    max="50"
                    className="w-full pl-9 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth"
                    placeholder="2"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
                <div className="relative">
                  <FiLayers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    name="interviewType"
                    value={config.interviewType}
                    onChange={handleConfigChange}
                    className="w-full pl-9 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth appearance-none bg-white"
                  >
                    {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Difficulty</label>
                <div className="relative">
                  <FiTrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    name="difficulty"
                    value={config.difficulty}
                    onChange={handleConfigChange}
                    className="w-full pl-9 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth appearance-none bg-white"
                  >
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Questions</label>
                <div className="relative">
                  <FiHash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    name="numQuestions"
                    value={config.numQuestions}
                    onChange={handleConfigChange}
                    className="w-full pl-9 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth appearance-none bg-white"
                  >
                    {QUESTION_COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={starting}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 text-sm rounded-lg hover:shadow-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {starting ? (
                <>
                  <FiLoader className="animate-spin" size={16} />
                  <span>Starting Interview...</span>
                </>
              ) : (
                <span>Start Interview</span>
              )}
            </button>
          </motion.form>
        </div>
      </div>
    );
  }

  const progress = Math.round(((interview.turns.length - 1) / interview.config.numQuestions) * 100);

  const AIBubble = ({ turn }) => (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
        <FiZap size={15} />
      </div>
      <div className="bg-white rounded-2xl rounded-tl-sm shadow-md px-4 py-3 max-w-[85%]">
        {turn?.isFollowUp && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 mb-2">
            <FiMessageCircle size={11} />
            Follow-up
          </span>
        )}
        <p className="text-gray-800 text-sm leading-relaxed">{turn?.questionText}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-sm text-slate-300 mb-2">
            <span>Question {interview.turns.length} of {interview.config.numQuestions}</span>
            <span className="flex items-center gap-1.5">
              <FiClock size={14} />
              {formatElapsed(elapsed)}
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Chat thread */}
        <div className="space-y-4 mb-4">
          <AnimatePresence initial={false}>
            {pastTurns.map((turn, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <AIBubble turn={turn} />
                <div className="flex items-start gap-3 justify-end">
                  <div
                    className={`rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] shadow-sm ${
                      turn.skipped
                        ? 'bg-gray-200 text-gray-500 italic'
                        : 'bg-cyan-600 text-white'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">
                      {turn.skipped ? 'Skipped this question' : turn.answerText}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0">
                    <FiUser size={15} />
                  </div>
                </div>
              </motion.div>
            ))}

            <motion.div
              key={`current-${interview.turns.length}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AIBubble turn={currentTurn} />
            </motion.div>
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-5">
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            rows="3"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth resize-none"
            placeholder="Type your answer..."
            disabled={!!submitAction || ending}
          />

          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <button
              onClick={() => handleSubmitAnswer(false)}
              disabled={!!submitAction || ending}
              className="flex-1 flex items-center justify-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm py-2 rounded-lg hover:shadow-xl transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitAction === 'answer' ? <FiLoader className="animate-spin" size={14} /> : <FiSend size={14} />}
              <span>{submitAction === 'answer' ? 'Evaluating...' : 'Submit Answer'}</span>
            </button>
            <button
              onClick={() => handleSubmitAnswer(true)}
              disabled={!!submitAction || ending}
              className="flex items-center justify-center space-x-1.5 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-50 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitAction === 'skip' ? <FiLoader className="animate-spin" size={14} /> : <FiSkipForward size={14} />}
              <span>{submitAction === 'skip' ? 'Skipping...' : 'Skip'}</span>
            </button>
            <button
              onClick={handleEndInterview}
              disabled={!!submitAction || ending}
              className="flex items-center justify-center space-x-1.5 px-4 py-2 border-2 border-red-200 text-red-600 font-semibold text-sm rounded-lg hover:bg-red-50 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ending ? <FiLoader className="animate-spin" size={14} /> : <FiXCircle size={14} />}
              <span>End Interview</span>
            </button>
          </div>

          {(submitAction || ending) && (
            <p className="text-xs text-gray-500 mt-2.5 text-center">
              AI is thinking — this can take up to 30-40 seconds, please don't refresh.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MockInterview;
