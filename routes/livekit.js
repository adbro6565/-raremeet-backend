const express = require('express');
const router = express.Router();
const { AccessToken } = require('livekit-server-sdk');
const { auth } = require('../middleware/auth');

const ensureLiveKitConfig = () => {
  if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
    throw new Error('LiveKit credentials are not configured in environment variables');
  }
};

router.post('/token', auth, async (req, res) => {
  try {
    ensureLiveKitConfig();

    const {
      roomName = `room-${req.userId}`,
      canPublish = true,
      canSubscribe = true,
      metadata = {},
      ttl = 60 * 60, // 1 hour
    } = req.body || {};

    const identity = `${req.userId}-${Date.now()}`;

    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity,
      ttl,
      metadata: JSON.stringify({
        userId: req.userId,
        name: req.user?.fullName || 'Guest',
        avatar: req.user?.photos?.[0]?.url,
        ...metadata,
      }),
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish,
      canSubscribe,
      canPublishData: true,
    });

    res.json({
      url: process.env.LIVEKIT_URL,
      token: token.toJwt(),
      roomName,
      identity,
      expiresIn: ttl,
    });
  } catch (error) {
    console.error('LiveKit token error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate LiveKit token' });
  }
});

module.exports = router;


