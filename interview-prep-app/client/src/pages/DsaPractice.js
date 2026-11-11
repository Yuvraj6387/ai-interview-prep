import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheck, FiCheckCircle, FiChevronRight, FiChevronDown, FiCode, FiExternalLink, FiLayers } from 'react-icons/fi';
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
const ProblemRow = ({ problem }) => (
  <div className="flex items-center hover:bg-orange-50/50 transition-smooth">
    <Link to={`/dsa/${problem.id}`} className="flex flex-1 min-w-0 items-center gap-3 pl-4 sm:pl-5 py-3.5">
      {problem.solved ? (
        <FiCheckCircle className="text-green-600 flex-shrink-0" size={18} aria-label="Solved" />
      ) : (
        <span className="w-[18px] h-[18px] rounded-full border-2 border-stone-200 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-800 text-sm sm:text-[15px] line-clamp-2">{problem.title}</p>
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

// The topic filter. A native <select> can't be styled (on Windows it opens a
// plain grey list), so this is a small dropdown of our own: a button, and a
// panel of topics with their counts. It closes on an outside tap or Escape.
const TopicPicker = ({ value, onChange, options, showSolved }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const current = options.find((o) => o.name === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!boxRef.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (name) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative sm:w-72">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Topic"
        className={`w-full flex items-center gap-3 pl-3.5 pr-3 py-3 rounded-xl bg-white border shadow-sm text-left transition-smooth ${
          open ? 'border-orange-400 ring-2 ring-orange-100' : 'border-stone-200 hover:border-orange-300'
        }`}
      >
        <FiLayers className="text-orange-600 flex-shrink-0" size={16} />
        <span className="flex-1 min-w-0 truncate text-sm font-semibold text-zinc-800">{current.label}</span>
        <span className="text-xs font-semibold text-zinc-500 bg-stone-100 rounded-full px-2 py-0.5 flex-shrink-0">{current.total}</span>
        <FiChevronDown className={`text-zinc-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} size={16} />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          role="listbox"
          aria-label="Topics"
          className="absolute z-30 left-0 mt-2 w-full sm:w-[34rem] max-h-[60vh] overflow-y-auto rounded-2xl bg-white border border-stone-200 shadow-xl shadow-orange-900/10 p-2 grid sm:grid-cols-2 gap-1"
        >
          {options.map((o) => {
            const selected = o.name === value;
            return (
              <button
                key={o.name}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choose(o.name)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-smooth ${
                  selected ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-zinc-700 hover:bg-stone-50'
                } ${o.name === 'All' ? 'sm:col-span-2' : ''}`}
              >
                <span className="w-4 flex-shrink-0">{selected && <FiCheck size={15} />}</span>
                <span className="flex-1 min-w-0">{o.label}</span>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 flex-shrink-0 ${
                  selected ? 'bg-orange-100 text-orange-700' : 'bg-stone-100 text-zinc-500'
                }`}
                >
                  {showSolved ? `${o.solved}/${o.total}` : o.total}
                </span>
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

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

  // Problems grouped by topic.
  const groups = useMemo(() => (data?.topics || [])
    .filter((t) => topic === 'All' || t === topic)
    .map((t) => {
      const inTopic = problems.filter((p) => p.topic === t);
      return {
        topic: t,
        solved: inTopic.filter((p) => p.solved).length,
        total: inTopic.length,
        rows: inTopic
          .filter((p) => difficulty === 'All' || p.difficulty === difficulty)
          .map((p) => ({ problem: p })),
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
            The most asked interview questions for every topic. Solve them here in JavaScript, Java, Python or C++, or open any of them on LeetCode.
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

            {/* Filters: a topic picker and a level switch. */}
            <div className="flex flex-col sm:flex-row gap-3">
              <TopicPicker
                value={topic}
                onChange={setTopic}
                showSolved={isAuthenticated}
                options={[
                  { name: 'All', label: 'All topics', total: problems.length, solved: solvedCount },
                  ...data.topics.map((t) => {
                    const inTopic = problems.filter((p) => p.topic === t);
                    return { name: t, label: t, total: inTopic.length, solved: inTopic.filter((p) => p.solved).length };
                  }),
                ]}
              />
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
                      {g.rows.map(({ problem }) => (
                        <ProblemRow key={problem.id} problem={problem} />
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
