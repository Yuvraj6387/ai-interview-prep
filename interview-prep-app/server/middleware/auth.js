const jwt = require('jsonwebtoken');

// Only verifies the token and hands the route the user id. Loading the user
// document here cost every single authenticated request an extra database
// round trip, and /auth/me is the only route that actually reads the document.
const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid authentication token' });
  }
};

module.exports = auth;
