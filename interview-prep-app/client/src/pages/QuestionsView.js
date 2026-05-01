import React, { useState, useEffect, useCallback } from 'react';
import { FiArrowLeft, FiRefreshCw, FiLoader } from 'react-icons/fi';
import { motion } from 'framer-motion';
import QuestionCard from '../components/QuestionCard';
import ExplanationPanel from '../components/ExplanationPanel';
import { profileAPI, questionAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';

const QuestionsView = ({ profile, onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const { showToast } = useToast();

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
      showToast('Questions regenerated successfully', 'success');
    } catch (error) {
      console.error('Error generating questions:', error);
      showToast('Failed to generate questions. Please check your API key and try again.', 'error');
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
          className="mb-8"
        >
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-white hover:text-purple-100 mb-6 transition-smooth"
          >
            <FiArrowLeft size={20} />
            <span className="font-medium">Back to Dashboard</span>
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="flex-1 mb-4 md:mb-0">
                <h1 className="text-3xl font-bold text-gray-800 mb-2 font-display">
                  {profile.targetRole}
                </h1>
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
                {profile.userId && profile.userId.fullName && (
                  <p className="text-sm text-gray-500 mb-2">
                    Created by {profile.userId.fullName}
                  </p>
                )}
                <p className="text-gray-600">
                  {profile.experience} {profile.experience === 1 ? 'year' : 'years'} experience
                </p>
              </div>

              <button
                onClick={generateQuestions}
                disabled={generating}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:shadow-xl transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <FiLoader className="animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <FiRefreshCw />
                    <span>Regenerate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Questions List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="spinner"></div>
          </div>
        ) : generating ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <FiLoader className="animate-spin text-purple-600 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-bold text-gray-800 mb-2 font-display">
              Generating Interview Questions...
            </h3>
            <p className="text-gray-600">
              AI is creating personalized questions based on your profile
            </p>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2 font-display">
              No Questions Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Click the Regenerate button to create interview questions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white font-display">
                Interview Questions ({questions.length})
              </h2>
            </div>
            
            {questions.map((question, index) => (
              <QuestionCard
                key={question._id}
                question={question}
                index={index}
                onLearnMore={setSelectedQuestion}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        )}
      </div>

      {/* Explanation Panel */}
      {selectedQuestion && (
        <ExplanationPanel
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
        />
      )}
    </div>
  );
};

export default QuestionsView;
