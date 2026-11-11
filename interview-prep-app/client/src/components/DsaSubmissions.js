import React, { useEffect, useState } from 'react';
import { FiCheckCircle, FiXCircle, FiChevronDown, FiCopy, FiCornerUpLeft, FiClock } from 'react-icons/fi';
import { dsaAPI } from '../services/api';
import { useToast } from './ToastProvider';

const LANGUAGE_LABELS = { javascript: 'JavaScript', java: 'Java', python: 'Python', cpp: 'C++' };

const formatDate = (iso) => new Date(iso).toLocaleString(undefined, {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

// The user's saved submissions for one problem, newest first. Open one to see
// its code, copy it, or load it back into the editor. `refreshKey` changes
// after each Submit so the new one shows up.
const DsaSubmissions = ({ problemId, refreshKey, onLoad }) => {
  const { showToast } = useToast();
  const [submissions, setSubmissions] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [onlyAccepted, setOnlyAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dsaAPI.submissions(problemId)
      .then(({ data }) => { if (!cancelled) setSubmissions(data.submissions); })
      .catch(() => { if (!cancelled) setSubmissions([]); });
    return () => { cancelled = true; };
  }, [problemId, refreshKey]);

  if (!submissions || submissions.length === 0) return null;

  const shown = onlyAccepted ? submissions.filter((s) => s.passed) : submissions;

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast('Code copied', 'success');
    } catch {
      showToast('Could not copy. Select the code and copy it instead.', 'error');
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="flex items-center gap-2 font-bold text-zinc-900">
          <FiClock className="text-orange-600" /> My Submissions
        </p>
        <label className="flex items-center gap-1.5 text-xs text-zinc-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyAccepted}
            onChange={(e) => setOnlyAccepted(e.target.checked)}
            className="accent-orange-600"
          />
          Accepted only
        </label>
      </div>

      {shown.length === 0 && <p className="text-sm text-zinc-500">No accepted submissions yet.</p>}

      <ul className="divide-y divide-stone-100">
        {shown.map((s) => {
          const open = openId === s._id;
          return (
            <li key={s._id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : s._id)}
                aria-expanded={open}
                className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-stone-50 rounded-lg px-1.5 transition-smooth"
              >
                {s.passed
                  ? <FiCheckCircle className="text-green-600 flex-shrink-0" />
                  : <FiXCircle className="text-red-500 flex-shrink-0" />}
                <span className={`text-sm font-semibold ${s.passed ? 'text-green-700' : 'text-red-600'}`}>
                  {s.passed ? 'Accepted' : `${s.passedCount}/${s.total} passed`}
                </span>
                <span className="text-xs text-zinc-500">{LANGUAGE_LABELS[s.language] || s.language}</span>
                <span className="ml-auto text-xs text-zinc-400 whitespace-nowrap">{formatDate(s.createdAt)}</span>
                <FiChevronDown className={`text-zinc-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="pb-3 px-1.5">
                  <pre className="text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg p-3 overflow-auto max-h-72 whitespace-pre">{s.code}</pre>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => onLoad(s.language, s.code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-smooth"
                    >
                      <FiCornerUpLeft size={12} /> Load in editor
                    </button>
                    <button
                      type="button"
                      onClick={() => copy(s.code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 border border-stone-200 hover:bg-stone-50 transition-smooth"
                    >
                      <FiCopy size={12} /> Copy
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DsaSubmissions;
