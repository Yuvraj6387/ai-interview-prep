const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  technicalAccuracy: { type: Number, min: 0, max: 100, default: 0 },
  communication: { type: Number, min: 0, max: 100, default: 0 },
  relevance: { type: Number, min: 0, max: 100, default: 0 },
  structure: { type: Number, min: 0, max: 100, default: 0 },
  confidence: { type: Number, min: 0, max: 100, default: 0 },
  problemSolving: { type: Number, min: 0, max: 100, default: 0 },
  isWeak: { type: Boolean, default: false },
  feedback: { type: String, default: '' }
}, { _id: false });

const turnSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  isFollowUp: { type: Boolean, default: false },
  askedAt: { type: Date, default: Date.now },
  answerText: { type: String, default: '' },
  skipped: { type: Boolean, default: false },
  answeredAt: { type: Date },
  evaluation: { type: evaluationSchema, default: null }
}, { _id: false });

const resultSchema = new mongoose.Schema({
  overallScore: { type: Number, min: 0, max: 100, default: 0 },
  technicalAccuracy: { type: Number, min: 0, max: 100, default: 0 },
  communication: { type: Number, min: 0, max: 100, default: 0 },
  relevance: { type: Number, min: 0, max: 100, default: 0 },
  structure: { type: Number, min: 0, max: 100, default: 0 },
  confidence: { type: Number, min: 0, max: 100, default: 0 },
  problemSolving: { type: Number, min: 0, max: 100, default: 0 },
  strengths: [{ type: String, trim: true }],
  improvements: [{ type: String, trim: true }],
  recommendedTopics: [{ type: String, trim: true }],
  recommendedPractice: [{ type: String, trim: true }]
}, { _id: false });

const interviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  config: {
    role: { type: String, required: true, trim: true },
    experienceLevel: { type: Number, required: true, min: 0 },
    interviewType: {
      type: String,
      required: true,
      enum: ['Technical', 'HR', 'Behavioral', 'Full Stack', 'Coding']
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['Easy', 'Medium', 'Hard']
    },
    numQuestions: { type: Number, required: true, min: 1, max: 20 }
  },
  resumeContext: {
    type: {
      technicalSkills: [{ type: String, trim: true }],
      projects: [{ type: String, trim: true }],
      suggestedRole: { type: String, trim: true }
    },
    default: null
  },
  turns: [turnSchema],
  status: {
    type: String,
    enum: ['in_progress', 'completed'],
    default: 'in_progress'
  },
  result: { type: resultSchema, default: null },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

module.exports = mongoose.model('Interview', interviewSchema);
