const mongoose = require('mongoose');

// One saved version of a resume made in the Resume Builder. A user can keep
// several (e.g. one per job type), so this is separate from the Resume model,
// which only holds the single uploaded PDF and its analysis.
const str = { type: String, trim: true, default: '' };

// Every template is single-column with real text, so all of them stay ATS-friendly.
const TEMPLATES = ['classic', 'modern', 'minimal', 'elegant', 'compact', 'bold'];

const experienceSchema = new mongoose.Schema({
  role: str, company: str, location: str, start: str, end: str,
  bullets: [{ type: String, trim: true }],
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: str, tech: str, link: str,
  bullets: [{ type: String, trim: true }],
}, { _id: false });

const educationSchema = new mongoose.Schema({
  degree: str, school: str, location: str, year: str, details: str,
}, { _id: false });

const skillGroupSchema = new mongoose.Schema({
  category: str,
  items: str, // comma-separated, e.g. "React, Node.js, MongoDB"
}, { _id: false });

const builtResumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true, default: 'My Resume', maxlength: 60 },
  template: { type: String, enum: TEMPLATES, default: 'classic' },
  // Colour for the name, headings and lines, as a hex code like "#0e7490".
  accentColor: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: '#0e7490' },
  content: {
    name: str,
    headline: str,
    email: str,
    phone: str,
    location: str,
    links: [{ type: String, trim: true }],
    summary: str,
    experience: [experienceSchema],
    projects: [projectSchema],
    education: [educationSchema],
    skills: [skillGroupSchema],
    certifications: [{ type: String, trim: true }],
  },
  // Set on versions made by "Tailor to a job", so the editor can show what changed.
  tailoredFor: {
    jobTitle: str,
    company: str,
    changes: [{ type: String, trim: true }],
    missingSkills: [{ type: String, trim: true }],
  },
}, { timestamps: true });

module.exports = mongoose.model('BuiltResume', builtResumeSchema);
module.exports.TEMPLATES = TEMPLATES;
