import React, { useState } from 'react';
import { FiX, FiBriefcase, FiAward, FiTag, FiFileText, FiLoader, FiZap } from 'react-icons/fi';
import { profileAPI } from '../services/api';
import { useToast } from './ToastProvider';

const AddJobModal = ({ onClose, onSubmit, loading, initialData, title = 'Add New Job Profile' }) => {
  const [formData, setFormData] = useState({
    targetRole: initialData?.targetRole || '',
    experience: initialData?.experience || '',
    topics: initialData?.topics || '',
    description: initialData?.description || '',
  });
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const { showToast } = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerateDescription = async () => {
    if (!formData.targetRole || !formData.topics) {
      showToast('Fill in Target Role and Topics first', 'error');
      return;
    }

    setGeneratingDescription(true);
    try {
      const response = await profileAPI.generateDescription({
        targetRole: formData.targetRole,
        experience: formData.experience,
        topics: formData.topics,
      });
      setFormData((prev) => ({ ...prev, description: response.data.description }));
    } catch (error) {
      console.error('Error generating description:', error);
      showToast('Failed to generate description. Please try again.', 'error');
    } finally {
      setGeneratingDescription(false);
    }
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
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto py-6 modal-backdrop animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-3.5 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-lg font-bold text-white font-display">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1.5 transition-smooth"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Target Role */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Target Role *
              </label>
              <div className="relative">
                <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  name="targetRole"
                  value={formData.targetRole}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth"
                  placeholder="e.g., Frontend Developer"
                  required
                />
              </div>
            </div>

            {/* Years of Experience */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Years *
              </label>
              <div className="relative">
                <FiAward className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  min="0"
                  max="50"
                  className="w-full pl-9 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth"
                  placeholder="3"
                  required
                />
              </div>
            </div>
          </div>

          {/* Topics */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Topics (comma separated) *
            </label>
            <div className="relative">
              <FiTag className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <textarea
                name="topics"
                value={formData.topics}
                onChange={handleChange}
                rows="2"
                className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth resize-none"
                placeholder="e.g., React, JavaScript, TypeScript"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700">
                Description (Optional)
              </label>
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={generatingDescription}
                className="flex items-center gap-1 text-xs font-medium text-cyan-600 hover:text-cyan-800 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingDescription ? (
                  <FiLoader className="animate-spin" size={11} />
                ) : (
                  <FiZap size={11} />
                )}
                <span>{generatingDescription ? 'Generating...' : 'Generate with AI'}</span>
              </button>
            </div>
            <div className="relative">
              <FiFileText className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="2"
                className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth resize-none"
                placeholder="Add additional context about the role..."
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-2.5 text-sm border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-smooth"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin" size={16} />
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
