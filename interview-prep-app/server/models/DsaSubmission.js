const mongoose = require('mongoose');

// One "Submit" on a DSA problem. A problem counts as solved once any of the
// user's submissions for it passed every test.
const dsaSubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: String, required: true },
  language: { type: String, enum: ['javascript', 'java'], required: true },
  code: { type: String, required: true, maxlength: 20000 },
  passedCount: { type: Number, required: true },
  total: { type: Number, required: true },
  passed: { type: Boolean, required: true },
}, { timestamps: true });

dsaSubmissionSchema.index({ userId: 1, problemId: 1, createdAt: -1 });

module.exports = mongoose.model('DsaSubmission', dsaSubmissionSchema);
