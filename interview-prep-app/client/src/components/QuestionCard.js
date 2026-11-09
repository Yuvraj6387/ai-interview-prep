import React, { useState, useEffect, useCallback } from 'react';
import { FiBookOpen, FiBookmark, FiChevronDown, FiChevronUp, FiLoader } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { questionAPI } from '../services/api';

const markdownComponents = {
  code({ inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');

    return !inline ? (
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match ? match[1] : 'javascript'}
        PreTag="div"
        customStyle={{ borderRadius: '10px', padding: '16px', fontSize: '14px' }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className="bg-gray-200 px-1 rounded">{children}</code>
    );
  },
  ul({ children }) {
    return <ul className="list-disc pl-5 mb-4">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal pl-5 mb-4">{children}</ol>;
  },
  h2({ children }) {
    return <h2 className="text-lg font-bold mt-4 mb-2">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-base font-semibold mt-3 mb-2">{children}</h3>;
  },
  p({ children }) {
    return <p className="mb-3">{children}</p>;
  },
};

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
      {/* Number tab tucked into the top-left corner, difficulty opposite it */}
      <div className="flex items-start justify-between">
        <span className="flex items-center gap-2">
          <span className="bg-gradient-to-br from-slate-700 to-slate-900 text-white font-bold text-xs px-3 py-1 rounded-br-xl">
            Q{index + 1}
          </span>
          {question.isPinned && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
              <FiBookmark size={11} fill="currentColor" /> Pinned
            </span>
          )}
        </span>
        {DIFFICULTY_STYLES[question.difficulty] && (
          <span className={`mt-2 mr-3 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${DIFFICULTY_STYLES[question.difficulty]}`}>
            {question.difficulty}
          </span>
        )}
      </div>

      <div className="px-4 pb-3 pt-1.5">
        <p className="text-gray-800 font-semibold text-sm sm:text-base leading-snug">
          {question.questionText}
        </p>

        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            onClick={() => onTogglePin(question._id)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-smooth ${
              question.isPinned
                ? 'bg-yellow-50 border-yellow-300 text-yellow-600 hover:bg-yellow-100'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title={question.isPinned ? 'Unpin' : 'Pin'}
            aria-label={question.isPinned ? 'Unpin question' : 'Pin question'}
          >
            <FiBookmark size={14} fill={question.isPinned ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={onToggleExplanation}
            className={`h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-smooth ${
              isExpanded
                ? 'bg-cyan-600 text-white'
                : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white hover:shadow-lg'
            }`}
            title={isExpanded ? 'Hide answer' : 'See model answer'}
          >
            <FiBookOpen size={14} />
            <span>{isExpanded ? 'Hide' : 'Answer'}</span>
            {isExpanded ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
          </button>
        </div>
      </div>

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
                  <FiLoader className="animate-spin mb-2 text-cyan-600" size={26} />
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
                <div className="prose prose-sm max-w-none">
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
