import React, { useState, useEffect } from 'react';
import { FiTarget, FiX, FiLoader } from 'react-icons/fi';

const MIN_LENGTH = 100;
const MAX_LENGTH = 4000;

// Paste a job description; the parent sends it and opens the new tailored version.
const TailorModal = ({ open, resumeTitle, loading, onSubmit, onClose }) => {
  const [jobDescription, setJobDescription] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !loading) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const tooShort = jobDescription.trim().length < MIN_LENGTH;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-backdrop animate-fade-in" onClick={loading ? undefined : onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (!tooShort) onSubmit(jobDescription.trim()); }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-5 md:p-6 animate-scale-in"
      >
        <div className="flex items-start gap-3 mb-4">
          <span className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center flex-shrink-0"><FiTarget size={14} /></span>
          <div className="flex-1">
            <h2 className="font-bold text-gray-800 font-display">Tailor to a job</h2>
            <p className="text-xs text-gray-500">Makes a new copy of “{resumeTitle}” aimed at this job. Your original stays as it is.</p>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="p-1 text-gray-400 hover:text-gray-600 rounded" aria-label="Close"><FiX /></button>
        </div>

        <textarea
          autoFocus
          rows="9"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value.slice(0, MAX_LENGTH))}
          disabled={loading}
          placeholder="Paste the company's job description: role, responsibilities, required skills..."
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-y"
        />
        <p className="text-[11px] text-gray-400 mt-1.5">
          It rewords your summary and bullets with the job's keywords and puts the most relevant skills and projects first.
          It never adds skills, numbers or experience you don't have. Skills you are missing are listed for you instead.
        </p>

        <div className="flex items-center justify-between gap-3 mt-4">
          <span className="text-xs text-gray-400">{jobDescription.length} / {MAX_LENGTH}</span>
          <button
            type="submit"
            disabled={tooShort || loading}
            className="btn-primary"
          >
            {loading ? <FiLoader className="animate-spin" /> : <FiTarget />}
            {loading ? 'Tailoring... (about 10s)' : 'Create tailored resume'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TailorModal;
