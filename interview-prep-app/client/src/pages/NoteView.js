import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowLeft, FiChevronDown, FiEdit2, FiTrash2, FiLink, FiLock, FiUser, FiCalendar, FiEye, FiEyeOff, FiMoreVertical
} from 'react-icons/fi';
import { notesAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDate } from './Notes';

// Answers are plain text. Text between ``` fences is shown as a code block, so
// writers can include small snippets without needing a full editor.
const AnswerText = ({ text }) => {
  const parts = text.split(/```[a-zA-Z]*\n?([\s\S]*?)```/g);
  return (
    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
      {parts.map((part, i) => {
        if (!part.trim()) return null;
        return i % 2 === 1 ? (
          <pre key={i} className="bg-slate-900 text-zinc-700 text-xs rounded-lg p-4 overflow-x-auto"><code>{part.replace(/\n$/, '')}</code></pre>
        ) : (
          <p key={i} className="whitespace-pre-wrap">{part.trim()}</p>
        );
      })}
    </div>
  );
};

// The owner's Edit / Delete options, tucked into a "⋮" menu so Delete isn't
// one stray tap away. Closes on an outside tap or Escape.
const OwnerMenu = ({ editTo, onDelete }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!boxRef.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More options"
        title="More options"
        className={`${CORNER_BUTTON} ${open ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}`}
      >
        <FiMoreVertical size={18} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-44 z-30 rounded-xl bg-white border border-stone-200 shadow-xl shadow-orange-900/10 p-1.5">
          <Link to={editTo} role="menuitem" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-700 hover:bg-stone-50">
            <FiEdit2 size={15} /> Edit note
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <FiTrash2 size={15} /> Delete note
          </button>
        </div>
      )}
    </div>
  );
};

// Round icon buttons in the title's corner.
const CORNER_BUTTON = 'w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-stone-200 text-zinc-600 hover:text-orange-700 hover:border-orange-300 shadow-sm transition-smooth';

const QuestionItem = ({ number, item, open, onToggle }) => (
  <div className="card overflow-hidden">
    <button type="button" onClick={onToggle} className="w-full flex items-start gap-4 px-5 py-4 text-left">
      <span className="w-8 h-8 rounded-full bg-orange-50 text-orange-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
        {number}
      </span>
      <p className="flex-1 pt-1 font-semibold text-gray-800">{item.question}</p>
      <FiChevronDown className={`mt-1.5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && (
      <div className="px-5 pb-5 pl-[4.25rem] border-t border-gray-100 pt-4">
        <AnswerText text={item.answer} />
      </div>
    )}
  </div>
);

const NoteView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');
  const [openItems, setOpenItems] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    notesAPI.get(id)
      .then((response) => setNote(response.data))
      .catch((err) => setError(err.response?.status === 404 ? 'This note does not exist, or it is private.' : 'Unable to load this note.'));
  }, [id]);

  const toggleItem = (index) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const allOpen = note && openItems.size === note.items.length;
  const toggleAll = () => setOpenItems(allOpen ? new Set() : new Set(note.items.map((_, i) => i)));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied', 'success');
    } catch {
      showToast('Could not copy the link', 'error');
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      await notesAPI.remove(id);
      showToast('Note deleted', 'success');
      navigate('/notes');
    } catch {
      showToast('Could not delete the note. Please try again.', 'error');
    }
  };

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <p className="text-zinc-700 mb-4">{error}</p>
        <Link to="/notes" className="btn-secondary"><FiArrowLeft /> <span>Back to notes</span></Link>
      </div>
    );
  }
  if (!note) {
    return <div className="flex justify-center py-20"><div className="spinner"></div></div>;
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <Link to="/notes" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
          <FiArrowLeft size={14} /> All notes
        </Link>

        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 font-display leading-tight">{note.title}</h1>
            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
              {note.isPublic && (
                <button type="button" onClick={copyLink} className={CORNER_BUTTON} aria-label="Copy link" title="Copy link">
                  <FiLink size={17} />
                </button>
              )}
              {note.isOwner && (
                <OwnerMenu editTo={`/notes/${note._id}/edit`} onDelete={() => setConfirmDelete(true)} />
              )}
            </div>
          </div>
          {note.description && <p className="text-zinc-600">{note.description}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
            <span className="flex items-center gap-1.5"><FiUser size={14} /> {note.author}</span>
            <span className="flex items-center gap-1.5"><FiCalendar size={14} /> {formatDate(note.updatedAt)}</span>
            <span>{note.items.length} questions</span>
            {!note.isPublic && <span className="flex items-center gap-1.5 text-amber-700"><FiLock size={14} /> Only you can see this</span>}
          </div>
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {note.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">{tag}</span>
              ))}
            </div>
          )}
        </motion.div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={toggleAll} className="btn-secondary">
            {allOpen ? <FiEyeOff /> : <FiEye />} <span>{allOpen ? 'Hide all answers' : 'Show all answers'}</span>
          </button>
        </div>

        <p className="text-xs text-zinc-500">Try answering each question yourself first, then open it to check.</p>

        <div className="space-y-3">
          {note.items.map((item, i) => (
            <QuestionItem key={i} number={i + 1} item={item} open={openItems.has(i)} onToggle={() => toggleItem(i)} />
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this note?"
        message="It will be removed for everyone. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
};

export default NoteView;
