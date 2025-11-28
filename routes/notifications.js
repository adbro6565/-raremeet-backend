const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// This route is for registering FCM tokens
router.post('/token', auth, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    // Store FCM token in user document or separate collection
    // For now, just acknowledge
    res.json({ message: 'Token registered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;




