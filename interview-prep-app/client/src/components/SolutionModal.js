import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiCopy, FiCornerUpLeft, FiLoader, FiCheckCircle } from 'react-icons/fi';
import { dsaAPI } from '../services/api';
import { useToast } from './ToastProvider';

const LANGUAGE_LABELS = { javascript: 'JavaScript', java: 'Java', python: 'Python', cpp: 'C++' };

// Pop-up from the DSA list showing the user's own accepted solution for one
// problem: the latest accepted one in each language they solved it in.
const SolutionModal = ({ problem, onClose }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [solutions, setSolutions] = useState(null); // [{ language, code, createdAt }]
  const [language, setLanguage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    dsaAPI.submissions(problem.id, { acceptedOnly: true })
      .then(({ data }) => {
        if (cancelled) return;
        // Newest first, so the first one per language is the latest.
        const latest = new Map();
        data.submissions.forEach((s) => { if (!latest.has(s.language)) latest.set(s.language, s); });
        const list = [...latest.values()];
        setSolutions(list);
        setLanguage(list[0]?.language || null);
      })
      .catch(() => { if (!cancelled) setSolutions([]); });
    return () => { cancelled = true; };
  }, [problem.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = solutions?.find((s) => s.language === language);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.code);
      showToast('Code copied', 'success');
    } catch {
      showToast('Could not copy. Select the code and copy it instead.', 'error');
    }
  };

  // Saves the code as that language's draft (the same keys the problem page
  // reads), so the editor opens with it.
  const openInEditor = () => {
    try {
      localStorage.setItem(`dsa-draft:${problem.id}:${current.language}`, current.code);
      localStorage.setItem('dsa-language', current.language);
    } catch { /* storage blocked: the page just opens with its own draft */ }
    navigate(`/dsa/${problem.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={`My solution: ${problem.title}`} className="relative card w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-stone-100">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700"><FiCheckCircle size={12} /> My solution</p>
            <h2 className="font-bold text-zinc-900 font-display truncate">{problem.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-zinc-500 hover:bg-stone-100">
            <FiX size={18} />
          </button>
        </div>

        <div className="p-5 overflow-auto">
          {!solutions ? (
            <div className="flex justify-center py-10"><FiLoader className="animate-spin text-orange-600" size={22} /></div>
          ) : !current ? (
            <p className="text-sm text-zinc-600 py-6 text-center">No saved accepted solution was found for this problem.</p>
          ) : (
            <>
              {solutions.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {solutions.map((s) => (
                    <button
                      key={s.language}
                      type="button"
                      onClick={() => setLanguage(s.language)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-smooth ${
                        s.language === language ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-stone-200 text-zinc-600 hover:bg-stone-50'
                      }`}
                    >
                      {LANGUAGE_LABELS[s.language] || s.language}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-zinc-500 mb-1.5">
                {LANGUAGE_LABELS[current.language] || current.language} · {new Date(current.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <pre className="text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg p-3 overflow-auto whitespace-pre">{current.code}</pre>
            </>
          )}
        </div>

        {current && (
          <div className="flex gap-2 px-5 py-3 border-t border-stone-100">
            <button type="button" onClick={openInEditor} className="btn-primary flex-1">
              <FiCornerUpLeft /> <span>Open in editor</span>
            </button>
            <button type="button" onClick={copy} className="btn-secondary flex-1">
              <FiCopy /> <span>Copy</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SolutionModal;
