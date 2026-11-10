import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiTarget, FiAward, FiTrendingUp, FiTag, FiMic } from 'react-icons/fi';
import { interviewAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';

const StatTile = ({ icon: Icon, label, value, suffix, accent }) => (
  <motion.div
    whileHover={{ y: -4 }}
    className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-5 flex items-center space-x-4 border-t-4 ${accent.border}`}
  >
    <div className={`${accent.tile} p-3 rounded-xl flex-shrink-0`}>
      <Icon size={22} />
    </div>
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-800 font-display">
        {value}
        {suffix && <span className="text-sm font-medium text-gray-400 ml-1">{suffix}</span>}
      </p>
    </div>
  </motion.div>
);

const TILE_ACCENTS = {
  cyan: { tile: 'bg-orange-50 text-orange-600', border: 'border-orange-500' },
  teal: { tile: 'bg-teal-50 text-teal-600', border: 'border-teal-500' },
  amber: { tile: 'bg-amber-50 text-amber-600', border: 'border-amber-400' },
};

const Analytics = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadInterviews = useCallback(async () => {
    try {
      const response = await interviewAPI.getAll();
      setInterviews(response.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      showToast('Unable to load your interview history', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  const stats = useMemo(() => {
    if (interviews.length === 0) {
      return { average: 0, best: 0, total: 0, trend: [], weakTopics: [], strongAreas: [] };
    }

    const scores = interviews.map((i) => i.result?.overallScore || 0);
    const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const best = Math.max(...scores);

    const trend = [...interviews]
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
      .map((i, idx) => ({
        name: `#${idx + 1}`,
        score: i.result?.overallScore || 0,
      }));

    const topicCounts = {};
    interviews.forEach((i) => {
      (i.result?.recommendedTopics || []).forEach((topic) => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    const weakTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([topic]) => topic);

    const roleScores = {};
    interviews.forEach((i) => {
      const role = i.config?.role || 'Unknown';
      if (!roleScores[role]) roleScores[role] = [];
      roleScores[role].push(i.result?.overallScore || 0);
    });
    const strongAreas = Object.entries(roleScores)
      .map(([role, scoreList]) => ({
        role,
        avg: Math.round(scoreList.reduce((a, b) => a + b, 0) / scoreList.length),
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 4);

    return { average, best, total: interviews.length, trend, weakTopics, strongAreas };
  }, [interviews]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-2 font-display">
            Analytics
          </h1>
          <p className="text-zinc-600">
            Your interview performance over time
          </p>
        </motion.div>

        {interviews.length === 0 ? (
          <div className="card p-8 md:p-10 text-center">
            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiTrendingUp size={40} className="text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3 font-display">No Data Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Complete a mock interview to start seeing your score trends and analytics here
            </p>
            <button
              onClick={() => navigate('/mock-interview')}
              className="btn-primary mx-auto"
            >
              <FiMic />
              <span>Start Mock Interview</span>
            </button>
          </div>
        ) : (
          <>
            {/* Stat tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatTile icon={FiMic} label="Total Interviews" value={stats.total} accent={TILE_ACCENTS.cyan} />
              <StatTile icon={FiTarget} label="Average Score" value={stats.average} suffix="/ 100" accent={TILE_ACCENTS.teal} />
              <StatTile icon={FiAward} label="Best Score" value={stats.best} suffix="/ 100" accent={TILE_ACCENTS.amber} />
            </div>

            {/* Trend chart */}
            <div className="card p-5 md:p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 font-display">Score Trend</h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <LineChart data={stats.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#ea580c" strokeWidth={2.5} dot={{ fill: '#ea580c', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weak topics & strong areas */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card p-5 md:p-6">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <FiTag size={16} className="text-orange-600" />
                  Weak Topics To Focus On
                </h4>
                <div className="flex flex-wrap gap-2">
                  {stats.weakTopics.length === 0 && <p className="text-sm text-gray-400">None identified yet</p>}
                  {stats.weakTopics.map((topic, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="card p-5 md:p-6">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <FiAward size={16} className="text-orange-600" />
                  Strongest Areas
                </h4>
                <div className="space-y-2">
                  {stats.strongAreas.map(({ role, avg }) => (
                    <div key={role} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{role}</span>
                      <span className="font-semibold text-orange-700">{avg}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* History */}
            <div className="card p-5 md:p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 font-display">Interview History</h3>
              <div className="space-y-2">
                {[...interviews]
                  .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                  .map((i) => (
                    <button
                      key={i._id}
                      onClick={() => navigate(`/interview-result/${i._id}`)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 transition-smooth text-left border border-gray-100"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{i.config.role}</p>
                        <p className="text-xs text-gray-500">
                          {i.config.interviewType} · {i.config.difficulty} · {new Date(i.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-orange-700">{i.result?.overallScore ?? '-'}</span>
                    </button>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;
