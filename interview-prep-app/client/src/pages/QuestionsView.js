import React, { useState, useEffect, useCallback } from 'react';
import { FiArrowLeft, FiRefreshCw, FiLoader, FiZap, FiHelpCircle, FiBookOpen, FiSend } from 'react-icons/fi';
import { motion } from 'framer-motion';
import QuestionCard from '../components/QuestionCard';
import { profileAPI, questionAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';

const QuestionsView = ({ profile, onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [askText, setAskText] = useState('');
  const [asking, setAsking] = useState(false);
  const { showToast } = useToast();

  // Ask AI: save the typed question, add it to the list and open its answer
  // straight away, like asking ChatGPT.
  const handleAsk = async (e) => {
    e.preventDefault();
    const text = askText.trim();
    if (text.length < 5 || asking) return;

    setAsking(true);
    try {
      const response = await questionAPI.ask(profile._id, text);
      setQuestions((prev) => [...prev, response.data]);
      setExpandedQuestionId(response.data._id);
      setAskText('');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not ask the AI. Please try again.', 'error');
    } finally {
      setAsking(false);
    }
  };

  const generateQuestions = useCallback(async () => {
    const profileId = profile?._id || profile?.id;
    if (!profileId) {
      showToast('Invalid profile selected. Please choose a valid job profile.', 'error');
      return;
    }

    setGenerating(true);
    try {
      const response = await profileAPI.generateQuestions(profileId);
      setQuestions(response.data);
      setExpandedQuestionId(null);
      showToast('New interview questions are ready', 'success');
    } catch (error) {
      console.error('Error generating questions:', error);
      showToast(error.response?.data?.message || 'Failed to generate questions. Please try again.', 'error');
    } finally {
      setGenerating(false);
    }
  }, [profile, showToast]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await questionAPI.getByProfile(profile._id);
      setQuestions(response.data);
      
      // If no questions exist, generate them automatically
      if (response.data.length === 0) {
        await generateQuestions();
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  }, [profile, generateQuestions]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Pinned questions go to the top. Each keeps its original Q number, and the
  // sort is stable, so the rest stay in their easy-to-hard order.
  const orderedQuestions = questions
    .map((question, i) => ({ question, number: i + 1 }))
    .sort((a, b) => Number(b.question.isPinned) - Number(a.question.isPinned));

  const handleTogglePin = async (questionId) => {
    try {
      const response = await questionAPI.togglePin(questionId);
      setQuestions(questions.map(q => 
        q._id === questionId ? response.data : q
      ));
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-zinc-700 hover:text-orange-600 mb-6 transition-smooth"
          >
            <FiArrowLeft size={20} />
            <span className="font-medium">Back to Dashboard</span>
          </button>

          <div className="card p-4 md:p-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex-1 w-full">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2 font-display leading-tight">
                  {profile.targetRole}
                </h1>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {profile.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full text-xs font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  {profile.experience} {profile.experience === 1 ? 'year' : 'years'} experience
                </p>
              </div>

              <motion.button
                onClick={generateQuestions}
                disabled={generating}
                whileHover={generating ? undefined : { y: -2 }}
                whileTap={generating ? undefined : { scale: 0.98 }}
                className="btn-primary w-full md:w-auto"
              >
                {generating ? (
                  <>
                    <FiLoader className="animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : questions.length === 0 ? (
                  <>
                    <FiZap />
                    <span>Generate Questions</span>
                  </>
                ) : (
                  <>
                    <FiRefreshCw />
                    <span>Regenerate</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Questions List */}
        {loading && !generating ? (
          <div className="flex justify-center items-center py-20">
            <div className="spinner"></div>
          </div>
        ) : generating ? (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-zinc-600 text-sm">
              <FiLoader className="animate-spin text-orange-400" />
              AI is writing 20 interview questions for {profile.targetRole}, from easy to hard...
            </p>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-md p-4 border-l-4 border-orange-600 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-5 rounded-lg bg-slate-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 rounded bg-gray-200" style={{ width: `${85 - i * 8}%` }} />
                    <div className="h-3 w-14 rounded-full bg-gray-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="card p-8 md:p-10 text-center">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <FiHelpCircle size={36} className="text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 font-display">
              No Questions Yet
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Generate 20 real interview questions for this role, from easy to hard, each with a model answer.
            </p>
            <button
              onClick={generateQuestions}
              className="btn-primary"
            >
              <FiZap />
              <span>Generate Questions</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 mb-3">
              <h2 className="text-lg font-bold text-zinc-900 font-display">
                Interview Questions ({questions.length})
              </h2>
              <p className="flex items-center gap-1.5 text-xs sm:text-sm text-zinc-600">
                <FiBookOpen size={14} className="text-orange-400" />
                Pin a question to keep it on top · Tap Answer for a model answer
              </p>
            </div>
            
            {orderedQuestions.map(({ question, number }) => (
              <QuestionCard
                key={question._id}
                question={question}
                index={number - 1}
                isExpanded={expandedQuestionId === question._id}
                onToggleExplanation={() =>
                  setExpandedQuestionId((prev) => (prev === question._id ? null : question._id))
                }
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        )}

        {/* Ask AI: any question of your own, answered the same way as the list above */}
        {!loading && !generating && questions.length > 0 && (
          <form onSubmit={handleAsk} className="card p-3 md:p-4 mt-5">
            <label htmlFor="ask-ai" className="block text-sm font-semibold text-zinc-900 mb-2">
              Ask AI anything about {profile.targetRole}
            </label>
            <div className="flex gap-2">
              <input
                id="ask-ai"
                type="text"
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                maxLength={500}
                placeholder="e.g. What is the difference between let, const and var?"
                className="flex-1 min-w-0 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={asking}
              />
              <button
                type="submit"
                disabled={asking || askText.trim().length < 5}
                className="btn-primary flex-shrink-0"
              >
                {asking ? <FiLoader className="animate-spin" /> : <FiSend />}
                <span className="hidden sm:inline">Ask</span>
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Your question is saved to this list with its answer, and stays when you regenerate.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default QuestionsView;
