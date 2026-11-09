import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiAward, FiThumbsUp, FiTrendingUp, FiBookOpen, FiRefreshCw, FiBarChart2, FiMap
} from 'react-icons/fi';
import { interviewAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';

const DIMENSIONS = [
  { key: 'technicalAccuracy', label: 'Technical Accuracy' },
  { key: 'communication', label: 'Communication' },
  { key: 'relevance', label: 'Relevance' },
  { key: 'structure', label: 'Answer Structure' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'problemSolving', label: 'Problem Solving' },
];

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
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-12 text-center">
          <h3 className="text-xl font-bold text-gray-800 mb-2 font-display">Result Not Available</h3>
          <p className="text-gray-600">This interview doesn't have a result yet.</p>
        </div>
      </div>
    );
  }

  const { result, config } = interview;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-display">
            Interview Result
          </h1>
          <p className="text-slate-300">
            {config.interviewType} interview for {config.role} · {config.difficulty} difficulty
          </p>
        </motion.div>

        {/* Overall score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white shadow-lg mx-auto mb-4">
            <FiAward size={36} />
          </div>
          <p className="text-sm text-gray-500 mb-1">Overall Score</p>
          <p className="text-4xl font-bold text-gray-800 font-display">{result.overallScore} / 100</p>
        </motion.div>

        {/* Dimension breakdown */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 font-display">Score Breakdown</h3>
          <div className="space-y-4">
            {DIMENSIONS.map(({ key, label }) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{label}</span>
                  <span className="text-gray-500">{result[key]}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-cyan-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${result[key]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths & improvements */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 grid md:grid-cols-2 gap-6">
          <ListSection title="What You Did Well" icon={FiThumbsUp} items={result.strengths} />
          <ListSection title="What To Improve" icon={FiTrendingUp} items={result.improvements} />
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 grid md:grid-cols-2 gap-6">
          <ListSection title="Recommended Topics" icon={FiBookOpen} items={result.recommendedTopics} />
          <ListSection title="Recommended Practice" icon={FiRefreshCw} items={result.recommendedPractice} />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/mock-interview')}
            className="flex-1 flex items-center justify-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 rounded-lg hover:shadow-xl transition-smooth"
          >
            <FiRefreshCw />
            <span>Practice Again</span>
          </button>
          <button
            onClick={() => navigate('/analytics')}
            className="flex-1 flex items-center justify-center space-x-2 bg-white text-cyan-700 font-semibold py-3 rounded-lg border-2 border-cyan-200 hover:bg-cyan-50 transition-smooth"
          >
            <FiBarChart2 />
            <span>View Analytics</span>
          </button>
          <button
            onClick={() => navigate('/roadmap')}
            className="flex-1 flex items-center justify-center space-x-2 bg-white text-cyan-700 font-semibold py-3 rounded-lg border-2 border-cyan-200 hover:bg-cyan-50 transition-smooth"
          >
            <FiMap />
            <span>Build Study Plan</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewResult;
