const mongoose = require('mongoose');

// One saved version of a resume made in the Resume Builder. A user can keep
// several (e.g. one per job type), so this is separate from the Resume model,
// which only holds the single uploaded PDF and its analysis.
const str = { type: String, trim: true, default: '' };

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
  template: { type: String, enum: ['classic', 'modern'], default: 'classic' },
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
}, { timestamps: true });

module.exports = mongoose.model('BuiltResume', builtResumeSchema);
