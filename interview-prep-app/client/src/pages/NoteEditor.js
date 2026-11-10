import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiTrash2, FiArrowUp, FiArrowDown, FiSave, FiLoader, FiGlobe, FiLock } from 'react-icons/fi';
import { notesAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';

const MAX_ITEMS = 100;
const emptyItem = () => ({ question: '', answer: '' });

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm text-gray-800';

const NoteEditor = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [items, setItems] = useState([emptyItem()]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    notesAPI.get(id)
      .then(({ data }) => {
        if (!data.isOwner) {
          navigate(`/notes/${id}`, { replace: true });
          return;
        }
        setTitle(data.title);
        setDescription(data.description);
        setTagsText(data.tags.join(', '));
        setIsPublic(data.isPublic);
        setItems(data.items.length ? data.items : [emptyItem()]);
      })
      .catch(() => {
        showToast('Unable to load this note', 'error');
        navigate('/notes', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate, showToast]);

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };
  const removeItem = (index) => setItems((prev) => (prev.length === 1 ? [emptyItem()] : prev.filter((_, i) => i !== index)));
  const moveItem = (index, delta) => {
    setItems((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      title: title.trim(),
      description: description.trim(),
      tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      isPublic,
      items: items.filter((item) => item.question.trim() || item.answer.trim()),
    };
    setSaving(true);
    try {
      const { data } = isEdit ? await notesAPI.update(id, payload) : await notesAPI.create(payload);
      showToast(isEdit ? 'Note updated' : isPublic ? 'Note published' : 'Note saved', 'success');
      navigate(`/notes/${data._id}`);
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not save the note. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="spinner"></div></div>;
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
        <Link to={isEdit ? `/notes/${id}` : '/notes'} className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
          <FiArrowLeft size={14} /> {isEdit ? 'Back to note' : 'All notes'}
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 font-display">{isEdit ? 'Edit Note' : 'New Note'}</h1>

        <div className="card p-5 md:p-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-gray-800 mb-1.5">Title</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
              placeholder="e.g. 30 Important React JS Interview Questions" className={inputClass} />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-800 mb-1.5">
              Short description <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input id="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300}
              placeholder="Who is this for, and what does it cover?" className={inputClass} />
          </div>
          <div>
            <label htmlFor="tags" className="block text-sm font-semibold text-gray-800 mb-1.5">
              Tags <span className="font-normal text-gray-400">(comma separated, up to 5)</span>
            </label>
            <input id="tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)}
              placeholder="React, JavaScript, Frontend" className={inputClass} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1.5">Who can read it?</p>
            <div className="grid grid-cols-2 gap-3 sm:w-96">
              {[
                { value: true, label: 'Everyone', hint: 'Shown in Explore', icon: FiGlobe },
                { value: false, label: 'Only me', hint: 'Private notes', icon: FiLock },
              ].map(({ value, label, hint, icon: Icon }) => (
                <button key={label} type="button" onClick={() => setIsPublic(value)}
                  className={`py-2.5 px-3 rounded-lg border-2 text-sm font-semibold text-left transition-smooth ${
                    isPublic === value ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-orange-200'
                  }`}>
                  <span className="flex items-center gap-2"><Icon size={14} /> {label}</span>
                  <span className="block text-xs font-normal text-gray-500">{hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 font-display">Questions &amp; Answers</h2>
          <span className="text-sm text-zinc-500">{items.length} / {MAX_ITEMS}</span>
        </div>
        <p className="text-xs text-zinc-500 -mt-3">Tip: put code between ``` lines to show it as a code block.</p>

        {items.map((item, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-orange-700">Question {i + 1}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0} aria-label="Move up"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-30 disabled:hover:bg-transparent">
                  <FiArrowUp size={16} />
                </button>
                <button type="button" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} aria-label="Move down"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-30 disabled:hover:bg-transparent">
                  <FiArrowDown size={16} />
                </button>
                <button type="button" onClick={() => removeItem(i)} aria-label="Remove question"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
            <input value={item.question} onChange={(e) => updateItem(i, 'question', e.target.value)} maxLength={500}
              placeholder="e.g. What is the difference between useMemo and useCallback?" className={inputClass} />
            <textarea value={item.answer} onChange={(e) => updateItem(i, 'answer', e.target.value)} maxLength={5000} rows={5}
              placeholder="Write the answer the way you would explain it in an interview" className={`${inputClass} resize-y`} />
          </div>
        ))}

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setItems((prev) => [...prev, emptyItem()])} disabled={items.length >= MAX_ITEMS} className="btn-secondary">
            <FiPlus /> <span>Add Question</span>
          </button>
          <button type="submit" disabled={saving || title.trim().length < 3} className="btn-primary">
            {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
            <span>{saving ? 'Saving...' : isEdit ? 'Save Changes' : isPublic ? 'Publish Note' : 'Save Note'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default NoteEditor;
