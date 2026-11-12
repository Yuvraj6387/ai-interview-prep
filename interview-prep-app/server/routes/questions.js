const express = require('express');
const router = express.Router();

// Bump this when the answer prompt changes, so old saved answers get rewritten.
const EXPLANATION_VERSION = 2;
const Question = require('../models/Question');
const JobProfile = require('../models/JobProfile');
const auth = require('../middleware/auth');
const aiService = require('../utils/aiService');

// Get all questions for a job profile
router.get('/profile/:profileId', auth, async (req, res) => {
  try {
    const questions = await Question.find({
      jobProfileId: req.params.profileId,
      userId: req.userId
    }).sort({ isCustom: 1, createdAt: 1 });

    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Ask AI: the user types their own question and it is saved to this profile.
// The answer then comes from the same /:id/explanation route as every other question.
router.post('/profile/:profileId/ask', auth, async (req, res) => {
  try {
    const questionText = (req.body.questionText || '').trim();
    if (questionText.length < 5) {
      return res.status(400).json({ message: 'Please type a question first.' });
    }
    if (questionText.length > 500) {
      return res.status(400).json({ message: 'Keep the question under 500 characters.' });
    }

    const profile = await JobProfile.findOne({ _id: req.params.profileId, userId: req.userId });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const question = await Question.create({
      jobProfileId: profile._id,
      userId: req.userId,
      questionText,
      isCustom: true,
    });

    profile.totalQuestions = (profile.totalQuestions || 0) + 1;
    await profile.save();

    res.status(201).json(question);
  } catch (error) {
    console.error('Error saving asked question:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all pinned questions for user
router.get('/pinned', auth, async (req, res) => {
  try {
    const questions = await Question.find({
      userId: req.userId,
      isPinned: true
    })
    .populate('jobProfileId', 'targetRole')
    .sort({ createdAt: -1 });
    
    res.json(questions);
  } catch (error) {
    console.error('Error fetching pinned questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle pin status
router.patch('/:id/pin', auth, async (req, res) => {
  try {
    const question = await Question.findOne({ _id: req.params.id, userId: req.userId });
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    question.isPinned = !question.isPinned;
    await question.save();
    
    res.json(question);
  } catch (error) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get explanation for a question
router.post('/:id/explanation', auth, async (req, res) => {
  try {
    const question = await Question.findOne({ _id: req.params.id, userId: req.userId });
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Reuse a saved answer if it was written in the current style
    if (question.explanation && question.explanationVersion >= EXPLANATION_VERSION) {
      return res.json({ explanation: question.explanation });
    }

    // Generate explanation using AI
    const profile = await JobProfile.findById(question.jobProfileId);
    const explanation = await aiService.generateExplanation(
      question.questionText,
      profile.targetRole,
      profile.topics
    );

    // Save explanation
    question.explanation = explanation;
    question.explanationVersion = EXPLANATION_VERSION;
    await question.save();

    res.json({ explanation });
  } catch (error) {
    console.error('Error generating explanation:', error);
    res.status(500).json({ message: 'Failed to generate explanation. Please try again.' });
  }
});

module.exports = router;
