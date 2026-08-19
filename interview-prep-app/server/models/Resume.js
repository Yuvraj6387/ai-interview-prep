const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  extractedText: {
    type: String,
    required: true
  },
  analysis: {
    score: { type: Number, min: 0, max: 100, default: 0 },
    technicalSkills: [{ type: String, trim: true }],
    softSkills: [{ type: String, trim: true }],
    missingSkills: [{ type: String, trim: true }],
    education: [{ type: String, trim: true }],
    projects: [{ type: String, trim: true }],
    experience: [{ type: String, trim: true }],
    strengths: [{ type: String, trim: true }],
    improvements: [{ type: String, trim: true }],
    suggestedRole: { type: String, trim: true, default: '' },
    suggestedTopics: [{ type: String, trim: true }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

resumeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Resume', resumeSchema);
