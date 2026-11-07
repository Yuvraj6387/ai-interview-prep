import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiZap, FiFilePlus, FiCopy, FiTrash2, FiEdit2, FiArrowLeft, FiDownload, FiLoader,
  FiUser, FiAlignLeft, FiBriefcase, FiFolder, FiBookOpen, FiTool, FiAward, FiCheck, FiAlertCircle,
} from 'react-icons/fi';
import { builderAPI, resumeAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';
import ConfirmDialog from '../components/ConfirmDialog';
import ResumePreview from '../components/builder/ResumePreview';
import { SectionCard, ProfileFields, SummaryField, EntryList, LinesField } from '../components/builder/EditorSections';

const BTN = 'flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed';
const PRIMARY = `${BTN} bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20`;
const SECONDARY = `${BTN} border border-gray-200 text-gray-700 hover:border-cyan-400 hover:text-cyan-700`;

// Saves this long after the last keystroke, so typing doesn't fire a request per letter.
const AUTOSAVE_DELAY_MS = 1200;

const SECTIONS = [
  { id: 'profile', title: 'Profile & Contact', icon: FiUser, tint: 'bg-cyan-50 text-cyan-700' },
  { id: 'summary', title: 'Professional Summary', icon: FiAlignLeft, tint: 'bg-slate-100 text-slate-700' },
  { id: 'experience', title: 'Work Experience', icon: FiBriefcase, tint: 'bg-purple-50 text-purple-700' },
  { id: 'projects', title: 'Projects', icon: FiFolder, tint: 'bg-green-50 text-green-700' },
  { id: 'skills', title: 'Skills', icon: FiTool, tint: 'bg-amber-50 text-amber-700' },
  { id: 'education', title: 'Education', icon: FiBookOpen, tint: 'bg-blue-50 text-blue-700' },
  { id: 'certifications', title: 'Certifications', icon: FiAward, tint: 'bg-rose-50 text-rose-700' },
];

const EXPERIENCE_FIELDS = [
  { key: 'role', label: 'Role', placeholder: 'Frontend Developer Intern' },
  { key: 'company', label: 'Company' },
  { key: 'start', label: 'Start', placeholder: 'Jun 2025' },
  { key: 'end', label: 'End', placeholder: 'Present' },
  { key: 'location', label: 'Location', wide: true },
];
const PROJECT_FIELDS = [
  { key: 'name', label: 'Project name' },
  { key: 'link', label: 'Link', placeholder: 'github.com/you/project' },
  { key: 'tech', label: 'Tech used', placeholder: 'React, Node.js, MongoDB', wide: true },
];
const EDUCATION_FIELDS = [
  { key: 'degree', label: 'Degree', placeholder: 'B.Tech, Computer Science' },
  { key: 'school', label: 'College / School' },
  { key: 'year', label: 'Year', placeholder: '2022 – 2026' },
  { key: 'details', label: 'Grade / details', placeholder: 'CGPA 8.2' },
];

const formatDate = (date) => new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/* ---------- List of saved versions ---------- */

const VersionList = () => {
  const [versions, setVersions] = useState(null);
  const [hasUpload, setHasUpload] = useState(false);
  const [busy, setBusy] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    builderAPI.list().then((r) => setVersions(r.data)).catch(() => setVersions([]));
    resumeAPI.getMine().then(() => setHasUpload(true)).catch(() => setHasUpload(false));
  }, []);

  const run = async (key, request, successMessage) => {
    setBusy(key);
    try {
      const response = await request();
      if (successMessage) showToast(successMessage, 'success');
      navigate(`/resume-builder/${response.data._id}`);
    } catch (error) {
      showToast(error.response?.data?.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setBusy('');
    }
  };

  const confirmDelete = async () => {
    const version = toDelete;
    setToDelete(null);
    try {
      await builderAPI.remove(version._id);
      setVersions((list) => list.filter((v) => v._id !== version._id));
      showToast('Resume deleted', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete. Please try again.', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-display">Resume Builder</h1>
        <p className="text-slate-300">Build an ATS-friendly resume, keep a version for each kind of job, and download it as a PDF</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-cyan-50 to-white rounded-2xl shadow-xl p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-10 h-10 rounded-xl bg-white shadow flex items-center justify-center text-cyan-600"><FiZap size={18} /></span>
            <div>
              <p className="font-bold text-gray-800 font-display">Magic Import</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">AI fast fill</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4 flex-1">
            {hasUpload
              ? 'Fill every section from the resume you uploaded in Resume Analyzer, then edit it here.'
              : <>Upload your PDF in <Link to="/resume" className="text-cyan-700 underline">Resume Analyzer</Link> first, and the AI will fill these sections from it.</>}
          </p>
          <button onClick={() => run('import', builderAPI.importFromUpload, 'Resume imported')} disabled={!hasUpload || !!busy} className={`${PRIMARY} self-start`}>
            {busy === 'import' ? <FiLoader className="animate-spin" /> : <FiZap />}
            {busy === 'import' ? 'Importing...' : 'Import my resume'}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700"><FiFilePlus size={18} /></span>
            <p className="font-bold text-gray-800 font-display">Start from blank</p>
          </div>
          <p className="text-sm text-gray-600 mb-4 flex-1">Fill in each section yourself and watch the preview update as you type.</p>
          <button onClick={() => run('blank', builderAPI.create)} disabled={!!busy} className={`${SECONDARY} self-start`}>
            {busy === 'blank' ? <FiLoader className="animate-spin" /> : <FiFilePlus />}
            New resume
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white font-display mb-3">Your versions</h2>
        {versions === null ? (
          <div className="flex justify-center py-10"><div className="spinner" /></div>
        ) : versions.length === 0 ? (
          <div className="bg-white/10 border border-white/15 rounded-2xl p-8 text-center text-slate-300 text-sm">
            No resumes yet. Import yours or start from blank above.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {versions.map((v) => (
              <div key={v._id} className="bg-white rounded-2xl shadow-xl p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-bold text-gray-800 truncate">{v.title}</p>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-50 text-cyan-700 capitalize flex-shrink-0">{v.template}</span>
                </div>
                <p className="text-sm text-gray-500 truncate">{[v.content?.name, v.content?.headline].filter(Boolean).join(' · ') || 'Not filled in yet'}</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Edited {formatDate(v.updatedAt)}</p>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => navigate(`/resume-builder/${v._id}`)} className={`${PRIMARY} flex-1`}><FiEdit2 /> Open</button>
                  <button onClick={() => run(`dup-${v._id}`, () => builderAPI.duplicate(v._id), 'Copy created')} disabled={!!busy} title="Duplicate" className={`${SECONDARY} px-3`}>
                    {busy === `dup-${v._id}` ? <FiLoader className="animate-spin" /> : <FiCopy />}
                  </button>
                  <button onClick={() => setToDelete(v)} title="Delete" className={`${SECONDARY} px-3 hover:!border-red-300 hover:!text-red-600`}><FiTrash2 /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this resume?"
        message={`"${toDelete?.title}" will be deleted for good.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

/* ---------- Editor for one version ---------- */

const SaveStatus = ({ status }) => {
  const states = {
    saved: { icon: FiCheck, text: 'Saved', className: 'text-emerald-600' },
    saving: { icon: FiLoader, text: 'Saving...', className: 'text-gray-500', spin: true },
    unsaved: { icon: FiEdit2, text: 'Unsaved changes', className: 'text-gray-500' },
    error: { icon: FiAlertCircle, text: 'Not saved, retrying on next edit', className: 'text-red-600' },
  };
  const { icon: Icon, text, className, spin } = states[status];
  return <span className={`flex items-center gap-1.5 text-xs font-medium ${className}`}><Icon className={spin ? 'animate-spin' : ''} />{text}</span>;
};

const Editor = ({ id }) => {
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState('classic');
  const [content, setContent] = useState({});
  const [status, setStatus] = useState('saved');
  const [openSections, setOpenSections] = useState(['profile']);
  const [mobileView, setMobileView] = useState('edit');
  const [generating, setGenerating] = useState(false);
  const skipNextSave = useRef(true);
  const latest = useRef({});
  const { showToast } = useToast();
  const navigate = useNavigate();

  latest.current = { title, template, content };

  useEffect(() => {
    builderAPI.get(id)
      .then(({ data }) => {
        skipNextSave.current = true;
        setTitle(data.title);
        setTemplate(data.template);
        setContent(data.content || {});
        setLoaded(true);
      })
      .catch(() => {
        showToast('That resume could not be found', 'error');
        navigate('/resume-builder', { replace: true });
      });
  }, [id, navigate, showToast]);

  const save = useCallback(async () => {
    setStatus('saving');
    try {
      await builderAPI.save(id, latest.current);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [id]);

  // Autosave a moment after the last change. The response is not written back
  // into state, so the server trimming text can't move the cursor mid-typing.
  useEffect(() => {
    if (!loaded) return undefined;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return undefined;
    }
    setStatus('unsaved');
    const timer = setTimeout(save, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [title, template, content, loaded, save]);

  // Warn before closing the tab with edits that haven't reached the server yet.
  useEffect(() => {
    if (status === 'saved') return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);

  const toggle = (sectionId) => setOpenSections((open) => (
    open.includes(sectionId) ? open.filter((s) => s !== sectionId) : [...open, sectionId]
  ));

  const generateSummary = async () => {
    setGenerating(true);
    try {
      const { data } = await builderAPI.summary(content, content.headline);
      setContent((c) => ({ ...c, summary: data.summary }));
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to write a summary. Please try again.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // The browser's own "Save as PDF" keeps the text selectable, which is what an
  // ATS needs, and needs no PDF library. The page title becomes the file name.
  const downloadPdf = () => {
    if (status !== 'saved') save();
    const pageTitle = document.title;
    document.title = [content.name, title].filter(Boolean).join(' - ') || 'Resume';
    window.print();
    document.title = pageTitle;
  };

  if (!loaded) {
    return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  }

  const setList = (key) => (value) => setContent((c) => ({ ...c, [key]: value }));
  const update = (next) => setContent(next);

  const sectionBody = {
    profile: <ProfileFields content={content} update={update} />,
    summary: <SummaryField content={content} update={update} onGenerate={generateSummary} generating={generating} />,
    experience: (
      <EntryList items={content.experience} onChange={setList('experience')} fields={EXPERIENCE_FIELDS} withBullets
        addLabel="Add experience" emptyEntry={{ role: '', company: '', location: '', start: '', end: '', bullets: [] }} />
    ),
    projects: (
      <EntryList items={content.projects} onChange={setList('projects')} fields={PROJECT_FIELDS} withBullets
        addLabel="Add project" emptyEntry={{ name: '', tech: '', link: '', bullets: [] }} />
    ),
    skills: (
      <EntryList items={content.skills} onChange={setList('skills')}
        fields={[{ key: 'category', label: 'Category', placeholder: 'Frontend' }, { key: 'items', label: 'Skills (comma-separated)', placeholder: 'React, Tailwind CSS' }]}
        addLabel="Add skill group" emptyEntry={{ category: '', items: '' }} />
    ),
    education: (
      <EntryList items={content.education} onChange={setList('education')} fields={EDUCATION_FIELDS}
        addLabel="Add education" emptyEntry={{ degree: '', school: '', location: '', year: '', details: '' }} />
    ),
    certifications: (
      <LinesField value={content.certifications} onChange={setList('certifications')} placeholder={'One per line, e.g.\nFull Stack Development (MERN) - Apna College'} />
    ),
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-xl p-3 md:p-4 flex flex-wrap items-center gap-3">
        <button onClick={() => navigate('/resume-builder')} title="All versions" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-cyan-700 transition-smooth">
          <FiArrowLeft size={18} />
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 60))}
          aria-label="Version name"
          className="flex-1 min-w-[10rem] px-3 py-2 text-sm font-semibold border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
        <div className="flex p-1 bg-gray-100 rounded-lg">
          {['classic', 'modern'].map((t) => (
            <button
              key={t}
              onClick={() => setTemplate(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-smooth ${template === t ? 'bg-white text-cyan-700 shadow' : 'text-gray-500'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <SaveStatus status={status} />
        <button onClick={downloadPdf} className={`${PRIMARY} ml-auto`}><FiDownload /> Download PDF</button>
      </div>

      {/* Phones: one panel at a time */}
      <div className="lg:hidden flex gap-1 p-1 bg-white/10 border border-white/15 rounded-xl">
        {['edit', 'preview'].map((v) => (
          <button key={v} onClick={() => setMobileView(v)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-smooth ${mobileView === v ? 'bg-white text-slate-900' : 'text-slate-200'}`}>
            {v}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className={`bg-white rounded-2xl shadow-xl p-4 md:p-5 space-y-3 ${mobileView === 'edit' ? '' : 'hidden lg:block'}`}>
          <h2 className="flex items-center gap-2 font-bold text-gray-800 font-display">
            <span className="w-1.5 h-5 rounded-full bg-cyan-600" /> Editor
          </h2>
          {SECTIONS.map(({ id: sectionId, title: sectionTitle, icon, tint }) => (
            <SectionCard key={sectionId} title={sectionTitle} icon={icon} tint={tint}
              open={openSections.includes(sectionId)} onToggle={() => toggle(sectionId)}>
              {sectionBody[sectionId]}
            </SectionCard>
          ))}
        </div>

        <div className={`lg:sticky lg:top-4 bg-white rounded-2xl shadow-xl overflow-hidden ${mobileView === 'preview' ? '' : 'hidden lg:block'}`}>
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="flex-1 text-center text-xs text-gray-400 -ml-8">PDF Preview</span>
          </div>
          <div className="lg:max-h-[calc(100vh-9rem)] overflow-y-auto bg-gray-100 p-3">
            <div className="shadow-md">
              <ResumePreview content={content} template={template} />
            </div>
          </div>
        </div>
      </div>

      {/* Only this copy is printed; index.css hides the rest of the app in print. */}
      {createPortal(
        <div className="resume-print-root"><ResumePreview content={content} template={template} /></div>,
        document.body
      )}
    </div>
  );
};

const ResumeBuilder = () => {
  const { id } = useParams();
  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      {id ? <Editor key={id} id={id} /> : <VersionList />}
    </div>
  );
};

export default ResumeBuilder;
