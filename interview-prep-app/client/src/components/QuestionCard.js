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
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-4 border-l-4 border-cyan-600"
    >
      <div className="flex justify-between items-center space-x-4">
        {/* Question Number & Text */}
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white font-bold rounded-lg px-2.5 py-0.5 text-xs flex-shrink-0">
              Q{index + 1}
            </div>
            <p className="text-gray-800 font-medium leading-snug flex-1">
              {question.questionText}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => onTogglePin(question._id)}
            className={`p-2 rounded-lg transition-smooth ${
              question.isPinned
                ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={question.isPinned ? 'Unpin' : 'Pin'}
          >
            <FiBookmark size={16} fill={question.isPinned ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={onToggleExplanation}
            className={`flex items-center gap-1 p-2 rounded-lg transition-smooth ${
              isExpanded
                ? 'bg-cyan-600 text-white'
                : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white hover:shadow-lg'
            }`}
            title={isExpanded ? 'Hide explanation' : 'Learn More'}
          >
            <FiBookOpen size={16} />
            {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
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
            <div className="mt-4 pt-4 border-t border-gray-100">
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
