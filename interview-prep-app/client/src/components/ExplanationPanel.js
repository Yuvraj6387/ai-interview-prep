import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiLoader } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { questionAPI } from '../services/api';

const ExplanationPanel = ({ question, onClose }) => {
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadExplanation = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await questionAPI.getExplanation(question._id);
      setExplanation(response.data.explanation);
    } catch (err) {
      setError('Failed to load explanation. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [question._id]);

  useEffect(() => {
    loadExplanation();
  }, [loadExplanation]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-5 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Learn More</h2>
          <button onClick={onClose} className="text-white p-2">
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100vh-80px)]">

          {/* Question */}
          <div className="bg-gray-100 p-4 rounded mb-6">
            <h3 className="text-sm font-semibold text-purple-600 mb-2">
              Question
            </h3>
            <p>{question.questionText}</p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center py-10">
              <FiLoader className="animate-spin mb-2" size={30} />
              <p>Generating explanation...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-red-600">
              {error}
              <button onClick={loadExplanation} className="ml-2 underline">
                Retry
              </button>
            </div>
          )}

          {/* Explanation */}
          {!loading && !error && (
            <div className="prose max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');

                    return !inline ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match ? match[1] : 'javascript'}
                        PreTag="div"
                        customStyle={{
                          borderRadius: '10px',
                          padding: '16px',
                          fontSize: '14px'
                        }}
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="bg-gray-200 px-1 rounded">
                        {children}
                      </code>
                    );
                  },

                  ul({ children }) {
                    return <ul className="list-disc pl-5 mb-4">{children}</ul>;
                  },

                  ol({ children }) {
                    return <ol className="list-decimal pl-5 mb-4">{children}</ol>;
                  },

                  h2({ children }) {
                    return <h2 className="text-xl font-bold mt-4 mb-2">{children}</h2>;
                  },

                  h3({ children }) {
                    return <h3 className="text-lg font-semibold mt-3 mb-2">{children}</h3>;
                  },

                  p({ children }) {
                    return <p className="mb-3">{children}</p>;
                  }
                }}
              >
                {explanation}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExplanationPanel;