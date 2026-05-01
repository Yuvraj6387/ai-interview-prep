const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const JobProfile = require('../models/JobProfile');
const auth = require('../middleware/auth');
const aiService = require('../utils/aiService');

// Get all questions for a job profile
router.get('/profile/:profileId', auth, async (req, res) => {
  try {
    const questions = await Question.find({
      jobProfileId: req.params.profileId
    }).sort({ createdAt: 1 });
    
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
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
    const question = await Question.findOne({ _id: req.params.id });
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // If explanation already exists, return it
    if (question.explanation) {
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
    await question.save();

    res.json({ explanation });
  } catch (error) {
    console.error('Error generating explanation:', error);
    res.status(500).json({ message: 'Failed to generate explanation. Please try again.' });
  }
});

module.exports = router;
