import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlus, FiSearch, FiBookOpen, FiLock, FiUser, FiGlobe } from 'react-icons/fi';
import { notesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

export const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric',
});

const NoteCard = ({ note }) => (
  <Link to={`/notes/${note._id}`} className="card card-hover p-5 flex flex-col hover:-translate-y-0.5 transition-smooth">
    <div className="flex items-start justify-between gap-3 mb-2">
      <h3 className="font-bold text-gray-800 font-display leading-snug">{note.title}</h3>
      {!note.isPublic && (
        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
          <FiLock size={10} /> Private
        </span>
      )}
    </div>
    {note.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{note.description}</p>}
    {note.tags.length > 0 && (
      <div className="flex flex-wrap gap-1.5 mb-3">
        {note.tags.map((tag) => (
          <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700">{tag}</span>
        ))}
      </div>
    )}
    <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
      <span className="flex items-center gap-1.5 truncate"><FiUser size={12} /> {note.author}</span>
      <span className="flex-shrink-0">{note.questionCount} Q&amp;A · {formatDate(note.updatedAt)}</span>
    </div>
  </Link>
);

const Notes = () => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState('explore');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Wait for a pause in typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const request = tab === 'mine' ? notesAPI.mine() : notesAPI.list(query);
    request
      .then((response) => { if (!cancelled) setNotes(response.data); })
      .catch(() => { if (!cancelled) showToast('Unable to load notes', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab, query, showToast]);

  const tabs = [
    { id: 'explore', label: 'Explore', icon: FiGlobe },
    { id: 'mine', label: 'My Notes', icon: FiBookOpen },
  ];

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-display">Important Notes</h1>
            <p className="text-slate-300">Interview questions and answers written by the community. Read them, or share your own.</p>
          </div>
          {isAuthenticated && (
            <Link to="/notes/new" className="btn-primary self-start sm:self-auto flex-shrink-0">
              <FiPlus /> <span>New Note</span>
            </Link>
          )}
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {isAuthenticated && (
            <div className="inline-flex bg-white/10 rounded-xl p-1 self-start">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-smooth ${
                    tab === id ? 'bg-white text-cyan-700 shadow' : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          )}
          {tab === 'explore' && (
            <div className="relative flex-1 sm:max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or tag, e.g. React"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none text-sm text-gray-800 bg-white"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner"></div></div>
        ) : notes.length === 0 ? (
          <div className="card p-10 text-center">
            <FiBookOpen className="mx-auto text-cyan-600 mb-3" size={32} />
            <p className="font-semibold text-gray-800 mb-1">
              {tab === 'mine' ? "You haven't written any notes yet" : query ? `No notes match "${query}"` : 'No notes yet'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {isAuthenticated
                ? 'Write down the questions you prepared, with your answers, so others can learn from them too.'
                : 'Sign in to write the first one.'}
            </p>
            {isAuthenticated && (
              <Link to="/notes/new" className="btn-primary"><FiPlus /> <span>Write a Note</span></Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {notes.map((note) => <NoteCard key={note._id} note={note} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notes;
