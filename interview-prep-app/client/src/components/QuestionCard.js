import React from 'react';
import { FiBookOpen, FiBookmark } from 'react-icons/fi';
import { motion } from 'framer-motion';

const QuestionCard = ({ question, onLearnMore, onTogglePin, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-l-4 border-purple-500"
    >
      <div className="flex justify-between items-start space-x-4">
        {/* Question Number & Text */}
        <div className="flex-1">
          <div className="flex items-start space-x-3">
            <div className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold rounded-lg px-3 py-1 text-sm mt-1">
              Q{index + 1}
            </div>
            <p className="text-gray-800 font-medium leading-relaxed flex-1">
              {question.questionText}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => onTogglePin(question._id)}
            className={`p-2.5 rounded-lg transition-smooth ${
              question.isPinned
                ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={question.isPinned ? 'Unpin' : 'Pin'}
          >
            <FiBookmark size={18} fill={question.isPinned ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={() => onLearnMore(question)}
            className="p-2.5 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-smooth"
            title="Learn More"
          >
            <FiBookOpen size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default QuestionCard;
