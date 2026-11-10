const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  jobProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobProfile',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard']
  },
  explanation: {
    type: String,
    default: ''
  },
  // Which answer style the saved explanation was written in. Answers from an
  // older prompt are written again in the current style the next time they open.
  explanationVersion: {
    type: Number,
    default: 1
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Question', questionSchema);
