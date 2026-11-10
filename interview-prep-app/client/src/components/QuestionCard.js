import React, { useState, useEffect, useCallback } from 'react';
import { FiBookOpen, FiBookmark, FiChevronDown, FiChevronUp, FiLoader } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { questionAPI } from '../services/api';
import MermaidDiagram from './MermaidDiagram';

const markdownComponents = {
  // react-markdown v10 no longer says whether code is inline, so a fenced
  // block is recognised by its language tag or by spanning several lines.
  // Without this, short inline code like `===` was drawn as a big code block.
  code({ className, children }) {
    const text = String(children).replace(/\n$/, '');
    const language = /language-(\w+)/.exec(className || '')?.[1];

    if (language === 'mermaid') {
      return <MermaidDiagram chart={text} />;
    }
    if (!language && !text.includes('\n')) {
      return <code className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 text-[0.9em] font-mono">{text}</code>;
    }
    return (
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language || 'javascript'}
        PreTag="div"
        customStyle={{ borderRadius: '10px', padding: '14px', fontSize: '13px', margin: '12px 0' }}
      >
        {text}
      </SyntaxHighlighter>
    );
  },
  // The code renderer above draws its own box, so skip the outer <pre>.
  pre({ children }) {
    return <>{children}</>;
  },
  ul({ children }) {
    return <ul className="list-disc pl-5 mb-3 space-y-1 marker:text-orange-400">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>;
  },
  h2({ children }) {
    return <h2 className="text-[15px] font-bold text-zinc-900 mt-4 mb-1.5">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-[15px] font-semibold text-zinc-900 mt-4 mb-1.5">{children}</h3>;
  },
  p({ children }) {
    return <p className="mb-3">{children}</p>;
  },
  strong({ children }) {
    return <strong className="font-semibold text-zinc-900">{children}</strong>;
  },
};

// Difficulty, pin and answer all use this same small pill.
const PILL = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-smooth';

const DIFFICULTY_STYLES = {
  Easy: 'bg-green-50 text-green-700',
  Medium: 'bg-amber-50 text-amber-700',
  Hard: 'bg-red-50 text-red-700',
};

const QuestionCard = ({ question, onTogglePin, isExpanded, onToggleExplanation, index }) => {
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetched, setFetched] = useState(false);

  const loadExplanation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await questionAPI.getExplanation(question._id);
      setExplanation(response.data.explanation);
      setFetched(true);
    } catch (err) {
      setError('Failed to load explanation. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [question._id]);

  useEffect(() => {
    if (isExpanded && !fetched && !loading) {
      loadExplanation();
    }
  }, [isExpanded, fetched, loading, loadExplanation]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, layout: { duration: 0.35 } }}
      className={`relative bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden ${
        question.isPinned ? 'ring-2 ring-amber-300' : ''
      }`}
    >
      {/* Top row: number tab on the left; difficulty, pin and answer as matching pills on the right */}
      <div className="flex items-start justify-between gap-2">
        <span className="bg-gradient-to-br from-slate-700 to-slate-900 text-white font-bold text-xs px-3 py-1 rounded-br-xl">
          Q{index + 1}
        </span>

        <div className="flex flex-wrap items-center justify-end gap-1.5 mt-1.5 mr-3">
          {DIFFICULTY_STYLES[question.difficulty] && (
            <span className={`${PILL} ${DIFFICULTY_STYLES[question.difficulty]}`}>
              {question.difficulty}
            </span>
          )}

          <button
            onClick={() => onTogglePin(question._id)}
            className={`${PILL} ${
              question.isPinned
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={question.isPinned ? 'Unpin' : 'Pin to top'}
            aria-label={question.isPinned ? 'Unpin question' : 'Pin question'}
          >
            <FiBookmark size={10} fill={question.isPinned ? 'currentColor' : 'none'} />
            {question.isPinned ? 'Pinned' : 'Pin'}
          </button>

          <button
            onClick={onToggleExplanation}
            className={`${PILL} ${
              isExpanded
                ? 'bg-orange-600 text-white hover:bg-orange-500'
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
            }`}
            title={isExpanded ? 'Hide answer' : 'See model answer'}
          >
            <FiBookOpen size={10} />
            {isExpanded ? 'Hide' : 'Answer'}
            {isExpanded ? <FiChevronUp size={10} /> : <FiChevronDown size={10} />}
          </button>
        </div>
      </div>

      <p className="px-4 pb-3 pt-1 text-gray-800 font-semibold text-sm sm:text-[15px] leading-snug">
        {question.questionText}
      </p>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mx-4 mb-4 pt-3 border-t border-gray-100">
              {loading && (
                <div className="flex flex-col items-center py-6">
                  <FiLoader className="animate-spin mb-2 text-orange-600" size={26} />
                  <p className="text-sm text-gray-500">Generating explanation...</p>
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm">
                  {error}
                  <button onClick={loadExplanation} className="ml-2 underline">
                    Retry
                  </button>
                </div>
              )}

              {!loading && !error && fetched && (
                <div className="text-sm text-gray-700 leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {explanation}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QuestionCard;
