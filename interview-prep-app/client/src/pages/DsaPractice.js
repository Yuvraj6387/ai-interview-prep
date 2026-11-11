import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiChevronRight, FiCode } from 'react-icons/fi';
import { dsaAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

export const DIFFICULTY_STYLES = {
  Easy: 'bg-green-50 text-green-700',
  Medium: 'bg-amber-50 text-amber-700',
  Hard: 'bg-red-50 text-red-700',
};

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-smooth ${
      active ? 'bg-orange-600 text-white' : 'bg-white text-zinc-600 border border-stone-200 hover:border-orange-300'
    }`}
  >
    {children}
  </button>
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
  const shown = useMemo(() => problems.filter((p) => (topic === 'All' || p.topic === topic)
    && (difficulty === 'All' || p.difficulty === difficulty)), [problems, topic, difficulty]);

  const solvedCount = problems.filter((p) => p.solved).length;
  const percent = problems.length ? Math.round((solvedCount / problems.length) * 100) : 0;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-2 font-display">DSA Practice</h1>
          <p className="text-zinc-600">Solve common interview problems in JavaScript or Java. Your code is checked against test cases.</p>
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
                  {problems.length} problems. Log in to run your code and save your progress.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                {['All', ...data.topics].map((t) => (
                  <Chip key={t} active={topic === t} onClick={() => setTopic(t)}>{t}</Chip>
                ))}
              </div>
              <div className="flex gap-2">
                {['All', ...DIFFICULTIES].map((d) => (
                  <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
                    {d === 'All' ? 'Any level' : d}
                  </Chip>
                ))}
              </div>
            </div>

            {shown.length === 0 ? (
              <div className="card p-10 text-center">
                <FiCode className="mx-auto text-orange-600 mb-3" size={28} />
                <p className="text-sm text-zinc-600">No problems match these filters.</p>
              </div>
            ) : (
              <div className="card divide-y divide-stone-100 overflow-hidden">
                {shown.map((p) => (
                  <Link
                    key={p.id}
                    to={`/dsa/${p.id}`}
                    className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-orange-50/50 transition-smooth"
                  >
                    {p.solved ? (
                      <FiCheckCircle className="text-green-600 flex-shrink-0" size={18} aria-label="Solved" />
                    ) : (
                      <span className="w-[18px] h-[18px] rounded-full border-2 border-stone-200 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-800 text-sm sm:text-[15px] truncate">
                        {problems.indexOf(p) + 1}. {p.title}
                      </p>
                      <p className="text-xs text-zinc-500">{p.topic}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${DIFFICULTY_STYLES[p.difficulty]}`}>
                      {p.difficulty}
                    </span>
                    <FiChevronRight className="text-zinc-300 flex-shrink-0" />
                  </Link>
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
