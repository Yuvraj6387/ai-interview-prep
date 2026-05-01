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
  explanation: {
    type: String,
    default: ''
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
