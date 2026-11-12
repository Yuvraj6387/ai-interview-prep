const express = require('express');
const router = express.Router();
const JobProfile = require('../models/JobProfile');
const Question = require('../models/Question');
const auth = require('../middleware/auth');
const aiService = require('../utils/aiService');

// Get the logged-in user's own job profiles
router.get('/', auth, async (req, res) => {
  try {
    const profiles = await JobProfile.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .limit(60)
      .populate('userId', 'fullName profileImage')
      .lean();
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

// Generate an AI-assisted description before the profile is created
router.post('/generate-description', auth, async (req, res) => {
  try {
    const { targetRole, experience, topics } = req.body;

    if (!targetRole || !topics) {
      return res.status(400).json({ message: 'Target role and topics are required' });
    }

    const topicsArray = Array.isArray(topics) ? topics : topics.split(',').map(t => t.trim()).filter(t => t);
    const description = await aiService.generateJobDescription(targetRole, experience || 0, topicsArray);

    res.json({ description });
  } catch (error) {
    console.error('Error generating description:', error);
    res.status(500).json({ message: error.message || 'Failed to generate description. Please try again.' });
  }
});

// Delete job profile
router.delete('/:id', auth, async (req, res) => {
  try {
    // Only the owner can delete a profile.
    const profile = await JobProfile.findOne({ _id: req.params.id, userId: req.userId });
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Delete all associated questions
    await Question.deleteMany({ jobProfileId: profile._id, userId: req.userId });
    
    await JobProfile.deleteOne({ _id: profile._id });
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

    // Generate first, so a failed AI call doesn't wipe the old list
    const aiQuestions = await aiService.generateInterviewQuestions(
      profile.targetRole,
      profile.experience,
      profile.topics
    );

    // Replace the old AI questions. Questions the user asked themselves stay.
    await Question.deleteMany({ jobProfileId: req.params.id, isCustom: { $ne: true } });

    await Question.insertMany(
      aiQuestions.map(q => ({
        jobProfileId: req.params.id,
        userId: req.userId,
        questionText: q.question,
        difficulty: q.difficulty
      }))
    );

    // Same order as GET /questions/profile/:id: AI questions first, then the user's own
    const questions = await Question.find({ jobProfileId: req.params.id, userId: req.userId })
      .sort({ isCustom: 1, createdAt: 1 });

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
