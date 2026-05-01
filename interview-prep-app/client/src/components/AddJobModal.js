import React, { useState } from 'react';
import { FiX, FiBriefcase, FiAward, FiTag, FiFileText, FiLoader } from 'react-icons/fi';

const AddJobModal = ({ onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    targetRole: '',
    experience: '',
    topics: '',
    description: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      experience: parseInt(formData.experience),
      topics: formData.topics.split(',').map(t => t.trim()).filter(t => t),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-5 flex justify-between items-center sticky top-0">
          <h2 className="text-2xl font-bold text-white font-display">
            Add New Job Profile
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-smooth"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Target Role */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Target Role *
            </label>
            <div className="relative">
              <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="targetRole"
                value={formData.targetRole}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-smooth"
                placeholder="e.g., Frontend Developer, DevOps Engineer"
                required
              />
            </div>
          </div>

          {/* Years of Experience */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Years of Experience *
            </label>
            <div className="relative">
              <FiAward className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                min="0"
                max="50"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-smooth"
                placeholder="e.g., 3"
                required
              />
            </div>
          </div>

          {/* Topics */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Topics (comma separated) *
            </label>
            <div className="relative">
              <FiTag className="absolute left-3 top-3 text-gray-400" />
              <textarea
                name="topics"
                value={formData.topics}
                onChange={handleChange}
                rows="3"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-smooth resize-none"
                placeholder="e.g., React, JavaScript, TypeScript, API Design, Testing"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter skills and technologies separated by commas
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description (Optional)
            </label>
            <div className="relative">
              <FiFileText className="absolute left-3 top-3 text-gray-400" />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-smooth resize-none"
                placeholder="Add additional context about the role or preparation focus..."
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-smooth"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 rounded-lg hover:shadow-xl transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddJobModal;
