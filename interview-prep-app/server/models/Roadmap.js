const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  done: { type: Boolean, default: false }
}, { _id: false });

const daySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  phase: { type: String, enum: ['Easy', 'Medium', 'Strong'], required: true },
  topic: { type: String, required: true, trim: true },
  goal: { type: String, default: '', trim: true },
  subtopics: [{ type: String, trim: true }],
  tasks: [itemSchema],
  questions: [itemSchema]
}, { _id: false });

// One active study plan per user, built from what they said they want to
// prepare for. Making a new plan replaces the old one.
const roadmapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  goal: { type: String, required: true, trim: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
  duration: { type: Number, enum: [3, 5, 7, 10, 14, 21, 30], required: true },
  days: [daySchema],
  startedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Roadmap', roadmapSchema);
