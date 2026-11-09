const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  done: { type: Boolean, default: false }
}, { _id: false });

const daySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  topic: { type: String, required: true, trim: true },
  goal: { type: String, default: '', trim: true },
  tasks: [itemSchema],
  questions: [itemSchema]
}, { _id: false });

const scoreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, min: 0, max: 100, default: 0 }
}, { _id: false });

// One active study plan per user. Making a new plan replaces the old one.
const roadmapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  role: { type: String, default: '', trim: true },
  duration: { type: Number, enum: [7, 30], required: true },
  weakTopics: [{ type: String, trim: true }],
  // Skill dimensions that were below the bar when the plan was made, with their
  // score at that time, so progress can be shown as "48 -> 63".
  weakSkills: [scoreSchema],
  baselineScore: { type: Number, min: 0, max: 100, default: 0 },
  days: [daySchema],
  startedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Roadmap', roadmapSchema);
