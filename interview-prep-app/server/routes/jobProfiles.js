const express = require('express');
const router = express.Router();
const JobProfile = require('../models/JobProfile');
const Question = require('../models/Question');
const auth = require('../middleware/auth');
const aiService = require('../utils/aiService');

// Get all job profiles from the community
router.get('/', auth, async (req, res) => {
  try {
    const profiles = await JobProfile.find()
      .sort({ updatedAt: -1 })
      .populate('userId', 'fullName profileImage');
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new job profile
router.post('/', auth, async (req, res) => {
  try {
    const { targetRole, experience, topics, description } = req.body;

    const profile = new JobProfile({
      userId: req.userId,
      targetRole,
      experience,
      topics: Array.isArray(topics) ? topics : topics.split(',').map(t => t.trim()),
      description
    });

    await profile.save();
    await profile.populate('userId', 'fullName profileImage');
    res.status(201).json(profile);
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete job profile
router.delete('/:id', auth, async (req, res) => {
  try {
    const profile = await JobProfile.findOne({ _id: req.params.id });
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Delete all associated questions
    await Question.deleteMany({ jobProfileId: req.params.id });
    
    await JobProfile.findByIdAndDelete(req.params.id);
    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate interview questions for a profile
router.post('/:id/generate-questions', auth, async (req, res) => {
  try {
    const profile = await JobProfile.findOne({ _id: req.params.id, userId: req.userId });
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Delete existing questions for this profile
    await Question.deleteMany({ jobProfileId: req.params.id });

    // Generate new questions using AI
    const aiQuestions = await aiService.generateInterviewQuestions(
      profile.targetRole,
      profile.experience,
      profile.topics
    );

    // Save questions to database
    const questions = await Question.insertMany(
      aiQuestions.map(q => ({
        jobProfileId: req.params.id,
        userId: req.userId,
        questionText: q.question
      }))
    );

    // Update total questions count
    profile.totalQuestions = questions.length;
    await profile.save();

    res.json(questions);
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ message: error.message || 'Failed to generate questions. Please try again.' });
  }
});

module.exports = router;
