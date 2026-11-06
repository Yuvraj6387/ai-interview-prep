const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

const authResponse = (user, message) => ({
  message,
  token: jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' }),
  user: {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    profileImage: user.profileImage
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, profileImage } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      fullName,
      email,
      password,
      profileImage: profileImage || ''
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.password) {
      return res.status(401).json({ message: 'This account uses Google sign-in. Please use "Continue with Google".' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Sign in with Google. The browser gets an ID token from Google; we ask Google's
// tokeninfo endpoint whether it is genuine and issued for this app, then log the
// user in, creating the account (or linking an existing one by email) if needed.
router.post('/google', async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: 'Google sign-in is not set up on this server yet.' });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Missing Google credential' });
    }

    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const profile = await response.json();

    const isValid = response.ok
      && profile.aud === process.env.GOOGLE_CLIENT_ID
      && GOOGLE_ISSUERS.includes(profile.iss)
      && String(profile.email_verified) === 'true';

    if (!isValid) {
      return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
    }

    const email = profile.email.toLowerCase();
    let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email }] });

    if (!user) {
      user = await User.create({
        fullName: profile.name || email.split('@')[0],
        email,
        googleId: profile.sub,
        profileImage: profile.picture || ''
      });
    } else if (!user.googleId) {
      // Already registered with a password: Google verified the email, so link the two.
      user.googleId = profile.sub;
      if (!user.profileImage && profile.picture) user.profileImage = profile.picture;
      await user.save();
    }

    res.json(authResponse(user, 'Login successful'));
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ message: 'Server error during Google sign-in' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('fullName email profileImage').lean();

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
