const express = require('express');
const router = express.Router();
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const Resume = require('../models/Resume');
const auth = require('../middleware/auth');
const aiService = require('../utils/aiService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are supported'));
    }
    cb(null, true);
  }
});

// Get the current user's saved resume analysis
router.get('/', auth, async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.userId });

    if (!resume) {
      return res.status(404).json({ message: 'No resume analysis found' });
    }

    res.json({ analysis: resume.analysis, updatedAt: resume.updatedAt });
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload and analyze a resume
router.post('/upload', auth, (req, res) => {
  upload.single('resume')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Failed to upload file' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No resume file provided' });
    }

    const parser = new PDFParse({ data: req.file.buffer });
    try {
      const parsed = await parser.getText();
      const extractedText = (parsed.text || '').trim();

      if (extractedText.length < 50) {
        return res.status(400).json({
          message: 'Could not extract readable text from this PDF. Please upload a text-based PDF, not a scanned image.'
        });
      }

      const analysis = await aiService.analyzeResume(extractedText.slice(0, 8000));

      const resume = await Resume.findOneAndUpdate(
        { userId: req.userId },
        { userId: req.userId, extractedText: extractedText.slice(0, 8000), analysis },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      res.json({ analysis: resume.analysis, updatedAt: resume.updatedAt });
    } catch (error) {
      console.error('Error analyzing resume:', error);
      res.status(500).json({ message: error.message || 'Failed to analyze resume. Please try again.' });
    } finally {
      await parser.destroy();
    }
  });
});

module.exports = router;
