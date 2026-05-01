import React from 'react';
import { FiTrash2, FiCalendar, FiAward, FiClock } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const JobCard = ({ profile, onSelect, onDelete }) => {
  const { user } = useAuth();
  const owner = profile.userId && typeof profile.userId === 'object' ? profile.userId : null;
  const isOwner = true; // Allow any user to delete any job profile

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -8 }}
      className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer border-2 border-transparent hover:border-purple-300"
      onClick={() => onSelect(profile)}
    >
      {/* Gradient Header */}
      <div className="h-2 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500"></div>
      
      <div className="p-6">
        {/* Title & Delete Button */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-3">
            <h3 className="text-xl font-bold text-gray-800 font-display">
              {profile.targetRole}
            </h3>
            {owner && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100">
                  {owner.profileImage ? (
                    <img
                      src={owner.profileImage}
                      alt={owner.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-300 flex items-center justify-center text-xs text-slate-600">
                      {owner.fullName?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <span>Created by {owner.fullName || 'Unknown user'}</span>
              </div>
            )}
          </div>

          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(profile._id);
              }}
              className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-smooth"
            >
              <FiTrash2 size={18} />
            </button>
          )}
        </div>

        {/* Description */}
        {profile.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {profile.description}
          </p>
        )}

        {/* Topics */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {profile.topics.slice(0, 3).map((topic, index) => (
              <span
                key={index}
                className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium"
              >
                {topic}
              </span>
            ))}
            {profile.topics.length > 3 && (
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                +{profile.topics.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-50 p-2 rounded-lg">
              <FiAward className="text-blue-600" size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Experience</p>
              <p className="text-sm font-semibold text-gray-800">
                {profile.experience} {profile.experience === 1 ? 'year' : 'years'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-green-50 p-2 rounded-lg">
              <FiClock className="text-green-600" size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Questions</p>
              <p className="text-sm font-semibold text-gray-800">
                {profile.totalQuestions || 0} Q&A
              </p>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center text-xs text-gray-500">
            <FiCalendar className="mr-1" size={12} />
            Updated {formatDate(profile.updatedAt)}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default JobCard;
