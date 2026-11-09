const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true, maxlength: 500 },
  answer: { type: String, required: true, trim: true, maxlength: 5000 }
}, { _id: false });

// A set of interview questions with answers that a user writes up, like
// "30 Important React Questions". Public notes can be read by anyone, even
// without logging in; private ones only by their author.
const noteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', trim: true, maxlength: 300 },
  tags: [{ type: String, trim: true, maxlength: 30 }],
  isPublic: { type: Boolean, default: true },
  items: [itemSchema]
}, { timestamps: true });

noteSchema.index({ isPublic: 1, updatedAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
