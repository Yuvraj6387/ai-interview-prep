import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiChevronRight, FiChevronDown, FiCode, FiExternalLink, FiLayers } from 'react-icons/fi';
import { dsaAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

export const DIFFICULTY_STYLES = {
  Easy: 'bg-green-50 text-green-700',
  Medium: 'bg-amber-50 text-amber-700',
  Hard: 'bg-red-50 text-red-700',
};

export const leetcodeUrl = (slug) => `https://leetcode.com/problems/${slug}/`;

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

// Text colour of the selected level in the level switch.
const LEVEL_TEXT = {
  All: 'text-orange-700',
  Easy: 'text-green-700',
  Medium: 'text-amber-700',
  Hard: 'text-red-700',
};

// One problem row. The LeetCode button sits beside the link (not inside it),
// because a link inside a link isn't allowed.
const ProblemRow = ({ problem, number }) => (
  <div className="flex items-center hover:bg-orange-50/50 transition-smooth">
    <Link to={`/dsa/${problem.id}`} className="flex flex-1 min-w-0 items-center gap-3 pl-4 sm:pl-5 py-3.5">
      {problem.solved ? (
        <FiCheckCircle className="text-green-600 flex-shrink-0" size={18} aria-label="Solved" />
      ) : (
        <span className="w-[18px] h-[18px] rounded-full border-2 border-stone-200 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-800 text-sm sm:text-[15px] line-clamp-2">{number}. {problem.title}</p>
        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${DIFFICULTY_STYLES[problem.difficulty]}`}>
          {problem.difficulty}
        </span>
      </div>
      <FiChevronRight className="text-zinc-300 flex-shrink-0" />
    </Link>
    {problem.leetcode ? (
      <a
        href={leetcodeUrl(problem.leetcode)}
        target="_blank"
        rel="noopener noreferrer"
        title="Open this question on LeetCode"
        aria-label={`Open ${problem.title} on LeetCode`}
        className="mx-2 sm:mx-3 w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-orange-600 hover:bg-orange-100/60 flex-shrink-0 transition-smooth"
      >
        <FiExternalLink size={16} />
      </a>
    ) : (
      <span className="mx-2 sm:mx-3 w-9 flex-shrink-0" />
    )}
  </div>
);

const DsaPractice = () => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [topic, setTopic] = useState('All');
  const [difficulty, setDifficulty] = useState('All');

  useEffect(() => {
    dsaAPI.list()
      .then((response) => setData(response.data))
      .catch(() => showToast('Unable to load problems', 'error'));
  }, [showToast]);

  const problems = useMemo(() => data?.problems || [], [data]);

  // Problems grouped by topic, each numbered within its topic (1, 2, 3...).
  const groups = useMemo(() => (data?.topics || [])
    .filter((t) => topic === 'All' || t === topic)
    .map((t) => {
      const inTopic = problems.filter((p) => p.topic === t);
      return {
        topic: t,
        solved: inTopic.filter((p) => p.solved).length,
        total: inTopic.length,
        rows: inTopic
          .map((p, i) => ({ problem: p, number: i + 1 }))
          .filter(({ problem }) => difficulty === 'All' || problem.difficulty === difficulty),
      };
    })
    .filter((g) => g.rows.length > 0), [data, problems, topic, difficulty]);

  const solvedCount = problems.filter((p) => p.solved).length;
  const percent = problems.length ? Math.round((solvedCount / problems.length) * 100) : 0;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-2 font-display">DSA Practice</h1>
          <p className="text-zinc-600">
            The most asked interview questions for every topic. Solve them here in JavaScript or Java, or open any of them on LeetCode.
          </p>
        </motion.div>

        {!data ? (
          <div className="flex justify-center py-16"><div className="spinner"></div></div>
        ) : (
          <>
            <div className="card p-5">
              {isAuthenticated ? (
                <>
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="text-sm font-semibold text-zinc-800">
                      {solvedCount} / {problems.length} solved
                    </p>
                    <p className="text-sm font-bold text-orange-600">{percent}%</p>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-600">
                  {problems.length} problems across {data.topics.length} topics. Log in to run your code and save your progress.
                </p>
              )}
            </div>

            {/* Filters: a topic dropdown (the phone's own picker on mobile) and
                a level switch. */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative sm:w-72">
                <FiLayers className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-600 pointer-events-none" size={16} />
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  aria-label="Topic"
                  className="w-full appearance-none pl-10 pr-10 py-3 rounded-xl bg-white border border-stone-200 shadow-sm text-base sm:text-sm font-semibold text-zinc-800 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
                >
                  <option value="All">All topics ({problems.length})</option>
                  {data.topics.map((t) => (
                    <option key={t} value={t}>{t} ({problems.filter((p) => p.topic === t).length})</option>
                  ))}
                </select>
                <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
              </div>
              <div className="flex flex-1 sm:max-w-md bg-stone-200/70 rounded-xl p-1" role="group" aria-label="Level">
                {['All', ...DIFFICULTIES].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    aria-pressed={difficulty === d}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-smooth ${
                      difficulty === d ? `bg-white shadow ${LEVEL_TEXT[d]}` : 'text-zinc-600 hover:bg-white/60'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="card p-10 text-center">
                <FiCode className="mx-auto text-orange-600 mb-3" size={28} />
                <p className="text-sm text-zinc-600">No problems match these filters.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groups.map((g) => (
                  <section key={g.topic}>
                    <div className="flex items-baseline justify-between mb-2 px-1">
                      <h2 className="font-bold text-zinc-900 font-display">{g.topic}</h2>
                      <span className="text-xs text-zinc-500">
                        {isAuthenticated ? `${g.solved} / ${g.total} solved` : `${g.total} questions`}
                      </span>
                    </div>
                    <div className="card divide-y divide-stone-100 overflow-hidden">
                      {g.rows.map(({ problem, number }) => (
                        <ProblemRow key={problem.id} problem={problem} number={number} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DsaPractice;
