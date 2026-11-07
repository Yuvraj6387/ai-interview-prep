import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiEdit3, FiLoader, FiCopy, FiCheck, FiTrendingUp, FiInfo } from 'react-icons/fi';
import { resumeAPI } from '../../services/api';
import { useToast } from '../ToastProvider';

const MAX_LENGTH = 500;

// Shows <X> placeholders in orange so it is obvious where a real number goes.
const WithPlaceholders = ({ text }) => (
  <>
    {text.split(/(<[^>]+>)/).map((part, i) =>
      /^<[^>]+>$/.test(part)
        ? <span key={i} className="px-1 mx-0.5 rounded bg-orange-100 text-orange-700 font-semibold">{part}</span>
        : <span key={i}>{part}</span>
    )}
  </>
);

const BulletRewriterTab = ({ suggestedRole }) => {
  const [bullet, setBullet] = useState('');
  const [targetRole, setTargetRole] = useState(suggestedRole || '');
  const [rewriting, setRewriting] = useState(false);
  const [result, setResult] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const { showToast } = useToast();

  const handleRewrite = async (e) => {
    e.preventDefault();
    if (bullet.trim().length < 10) {
      showToast('Please enter a bullet point of at least 10 characters', 'error');
      return;
    }

    setRewriting(true);
    try {
      const response = await resumeAPI.rewriteBullet(bullet.trim(), targetRole.trim());
      setResult({ original: bullet.trim(), ...response.data });
      setCopiedIndex(null);
    } catch (error) {
      console.error('Error rewriting bullet:', error);
      showToast(error.response?.data?.message || 'Failed to rewrite the bullet. Please try again.', 'error');
    } finally {
      setRewriting(false);
    }
  };

  const copy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
    } catch {
      showToast('Could not copy. Please select the text and copy it manually.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleRewrite} className="bg-white rounded-2xl shadow-xl p-5 md:p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Experience or project bullet</label>
        <textarea
          value={bullet}
          onChange={(e) => setBullet(e.target.value.slice(0, MAX_LENGTH))}
          rows="3"
          disabled={rewriting}
          placeholder="e.g. Worked on React projects."
          className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth resize-y"
        />
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value.slice(0, 80))}
            disabled={rewriting}
            placeholder="Target role (optional)"
            className="flex-1 px-4 py-3 text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth"
          />
          <button
            type="submit"
            disabled={rewriting}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-md shadow-cyan-600/20 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rewriting ? <FiLoader className="animate-spin" /> : <FiEdit3 />}
            <span>{rewriting ? 'Rewriting...' : 'Rewrite Bullet'}</span>
          </button>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
          <FiInfo size={12} className="flex-shrink-0" />
          It never makes up numbers. <span className="px-1 rounded bg-orange-100 text-orange-700 font-semibold">&lt;X&gt;</span> marks where your real figure should go.
        </p>
      </form>

      {result && !rewriting && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Before</p>
            <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 line-through decoration-red-300">{result.original}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {result.variants.map((variant, i) => (
              <div key={variant.style} className="bg-white rounded-2xl shadow-xl p-5 flex flex-col">
                <span className="self-start px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 mb-3">
                  {variant.style}
                </span>
                <p className="text-sm text-gray-800 leading-relaxed flex-1">
                  <WithPlaceholders text={variant.text} />
                </p>
                <button
                  onClick={() => copy(variant.text, i)}
                  className="mt-4 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:border-cyan-400 hover:text-cyan-700 transition-smooth"
                >
                  {copiedIndex === i ? <FiCheck className="text-emerald-600" /> : <FiCopy />}
                  <span>{copiedIndex === i ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            ))}
          </div>

          {result.tips.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <FiTrendingUp size={16} className="text-cyan-600" />
                Make it even stronger
              </h3>
              <ul className="space-y-2">
                {result.tips.map((tip) => (
                  <li key={tip} className="flex gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 flex-shrink-0" />
                    <WithPlaceholders text={tip} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default BulletRewriterTab;
