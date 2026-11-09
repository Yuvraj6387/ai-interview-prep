import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiZap, FiFilePlus, FiCopy, FiTrash2, FiEdit2, FiArrowLeft, FiDownload, FiLoader,
  FiUser, FiAlignLeft, FiBriefcase, FiFolder, FiBookOpen, FiTool, FiAward, FiCheck, FiAlertCircle,
  FiTarget, FiX,
} from 'react-icons/fi';
import { builderAPI, resumeAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';
import { ResumeBuilderArt, PAGE_ART_CLASS } from '../components/PageIllustrations';
import ConfirmDialog from '../components/ConfirmDialog';
import ResumePreview, { DEFAULT_ACCENT, TEMPLATES } from '../components/builder/ResumePreview';
import DesignPanel from '../components/builder/DesignPanel';
import TailorModal from '../components/builder/TailorModal';
import { SectionCard, ProfileFields, SummaryField, EntryList, LinesField } from '../components/builder/EditorSections';

const BTN = 'flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed';
const PRIMARY = `${BTN} bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white shadow-md shadow-cyan-600/25`;
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

/* ---------- Tailor to a job (used by the list and the editor) ---------- */

const useTailor = () => {
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const submit = async (jobDescription) => {
    setLoading(true);
    try {
      const { data } = await builderAPI.tailor(target.id, jobDescription);
      setTarget(null);
      showToast('Tailored resume created', 'success');
      navigate(`/resume-builder/${data._id}`);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to tailor your resume. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <TailorModal open={!!target} resumeTitle={target?.title} loading={loading} onSubmit={submit} onClose={() => setTarget(null)} />
  );
  return { open: (id, title) => setTarget({ id, title }), modal };
};

const TailoredNotes = ({ notes, onDismiss }) => (
  <div className="card p-4 md:p-5">
    <div className="flex items-start gap-3">
      <span className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center flex-shrink-0"><FiTarget size={14} /></span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-800 font-display">
          Tailored for {[notes.jobTitle, notes.company].filter(Boolean).join(' at ') || 'this job'}
        </p>
        <p className="text-xs text-gray-500">Check the wording below before you send it. You can still edit anything.</p>
      </div>
      <button onClick={onDismiss} className="p-1 text-gray-400 hover:text-gray-600 rounded" aria-label="Hide"><FiX /></button>
    </div>
    <div className="grid md:grid-cols-2 gap-4 mt-3">
      {notes.changes?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-1.5">What changed</p>
          <ul className="space-y-1">
            {notes.changes.map((c) => (
              <li key={c} className="flex gap-2 text-sm text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 flex-shrink-0" />{c}
              </li>
            ))}
          </ul>
        </div>
      )}
      {notes.missingSkills?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-1.5">Job wants these, not on your resume</p>
          <div className="flex flex-wrap gap-1.5">
            {notes.missingSkills.map((s) => (
              <span key={s} className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">{s}</span>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">Not added for you. Add one only if you really have it.</p>
        </div>
      )}
    </div>
  </div>
);

/* ---------- List of saved versions ---------- */

const VersionList = () => {
  const [versions, setVersions] = useState(null);
  const [hasUpload, setHasUpload] = useState(false);
  const [busy, setBusy] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const tailor = useTailor();

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
    <div className="relative max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-display">Resume Builder</h1>
        <p className="text-slate-300">Build an ATS-friendly resume, keep a version for each kind of job, and download it as a PDF</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card bg-gradient-to-br from-cyan-50 to-white p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-cyan-600"><FiZap size={14} /></span>
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

        <div className="card p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700"><FiFilePlus size={14} /></span>
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
              <div key={v._id} className="card p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-bold text-gray-800 truncate">{v.title}</p>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 flex-shrink-0">
                    <span className="w-2 h-2 rounded-full" style={{ background: v.accentColor || DEFAULT_ACCENT }} />
                    {TEMPLATES[v.template]?.label || v.template}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">{[v.content?.name, v.content?.headline].filter(Boolean).join(' · ') || 'Not filled in yet'}</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Edited {formatDate(v.updatedAt)}</p>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => navigate(`/resume-builder/${v._id}`)} className={`${PRIMARY} flex-1`}><FiEdit2 /> Open</button>
                  <button onClick={() => tailor.open(v._id, v.title)} title="Tailor to a job" className={`${SECONDARY} px-3`}><FiTarget /></button>
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
      {tailor.modal}
    </div>
  );
};

/* ---------- Editor for one version ---------- */

const SaveStatus = ({ status }) => {
  const states = {
    saved: { icon: FiCheck, text: 'Saved', className: 'text-emerald-600' },
    saving: { icon: FiLoader, text: 'Saving...', className: 'text-gray-500', spin: true },
    unsaved: { icon: FiEdit2, text: 'Unsaved', more: ' changes', className: 'text-gray-500' },
    error: { icon: FiAlertCircle, text: 'Not saved', more: ', retrying on next edit', className: 'text-red-600' },
  };
  const { icon: Icon, text, more, className, spin } = states[status];
  // Short text on phones so it fits next to the resume name.
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium whitespace-nowrap flex-shrink-0 ${className}`}>
      <Icon className={spin ? 'animate-spin' : ''} />{text}{more && <span className="hidden sm:inline">{more}</span>}
    </span>
  );
};

const Editor = ({ id }) => {
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState('classic');
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [showDesign, setShowDesign] = useState(false);
  const [content, setContent] = useState({});
  const [status, setStatus] = useState('saved');
  const [openSections, setOpenSections] = useState(['profile']);
  const [mobileView, setMobileView] = useState('edit');
  const [generating, setGenerating] = useState(false);
  const [tailoredFor, setTailoredFor] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const tailor = useTailor();
  const skipNextSave = useRef(true);
  const latest = useRef({});
  const { showToast } = useToast();
  const navigate = useNavigate();

  latest.current = { title, template, accentColor, content };

  useEffect(() => {
    builderAPI.get(id)
      .then(({ data }) => {
        skipNextSave.current = true;
        setTitle(data.title);
        setTemplate(data.template);
        setAccentColor(data.accentColor || DEFAULT_ACCENT);
        setContent(data.content || {});
        setTailoredFor(data.tailoredFor?.jobTitle || data.tailoredFor?.company ? data.tailoredFor : null);
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
  }, [title, template, accentColor, content, loaded, save]);

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

  // Builds a real PDF file in the browser and saves it as "First_Last_Resume.pdf".
  // The PDF code is loaded only now, on click, because the library is large.
  const downloadPdf = async () => {
    if (status !== 'saved') save();
    setDownloading(true);
    try {
      const { downloadResumePdf } = await import('../components/builder/ResumePdf');
      await downloadResumePdf({ content, template, accentColor });
    } catch (error) {
      console.error('Error creating PDF:', error);
      showToast('Could not create the PDF. Please try again.', 'error');
    } finally {
      setDownloading(false);
    }
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
      {/* Phones: name + status on one row, then three equal buttons.
          Wider screens: everything on one line. */}
      <div className="card p-3 md:p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={() => navigate('/resume-builder')} title="All versions" className="p-2 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-cyan-700 transition-smooth flex-shrink-0">
            <FiArrowLeft size={16} />
          </button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 60))}
            aria-label="Version name"
            className="flex-1 min-w-0 px-3 py-2 text-sm font-semibold border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          />
          <SaveStatus status={status} />
        </div>
        <div className="grid grid-cols-3 lg:flex gap-2">
          <button
            onClick={() => setShowDesign((v) => !v)}
            className={`${SECONDARY} px-2 sm:px-4 ${showDesign ? '!border-cyan-500 !text-cyan-700 bg-cyan-50' : ''}`}
          >
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: accentColor }} />
            <span className="whitespace-nowrap">Design<span className="hidden lg:inline">: {TEMPLATES[template]?.label}</span></span>
          </button>
          <button
            onClick={async () => { if (status !== 'saved') await save(); tailor.open(id, title); }}
            className={`${SECONDARY} px-2 sm:px-4`}
          >
            <FiTarget className="flex-shrink-0" /> <span>Tailor<span className="hidden sm:inline"> to a job</span></span>
          </button>
          <button onClick={downloadPdf} disabled={downloading} className={`${PRIMARY} px-2 sm:px-4`}>
            {downloading ? <FiLoader className="animate-spin flex-shrink-0" /> : <FiDownload className="flex-shrink-0" />}
            <span><span className="hidden sm:inline">Download </span>PDF</span>
          </button>
        </div>
      </div>

      {showDesign && (
        <DesignPanel template={template} accentColor={accentColor} onTemplate={setTemplate} onColor={setAccentColor} />
      )}

      {tailoredFor && <TailoredNotes notes={tailoredFor} onDismiss={() => setTailoredFor(null)} />}

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
        <div className={`card p-4 md:p-5 space-y-3 ${mobileView === 'edit' ? '' : 'hidden lg:block'}`}>
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

        <div className={`lg:sticky lg:top-4 card overflow-hidden ${mobileView === 'preview' ? '' : 'hidden lg:block'}`}>
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="flex-1 text-center text-xs text-gray-400 -ml-8">PDF Preview</span>
          </div>
          <div className="lg:max-h-[calc(100vh-9rem)] overflow-y-auto bg-gray-100 p-3">
            <div className="shadow-md">
              <ResumePreview content={content} template={template} accentColor={accentColor} />
            </div>
          </div>
        </div>
      </div>

      {tailor.modal}
    </div>
  );
};

const ResumeBuilder = () => {
  const { id } = useParams();
  return (
    <div className="relative min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      {/* Only on the versions list: the editor fills the whole width. */}
      {!id && <ResumeBuilderArt className={PAGE_ART_CLASS} />}
      {id ? <Editor key={id} id={id} /> : <VersionList />}
    </div>
  );
};

export default ResumeBuilder;
