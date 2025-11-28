const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Match = require('../models/Match');
const Chat = require('../models/Chat');
const Call = require('../models/Call');

// Get all users (admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const users = await User.find(query)
      .select('-password -coinTransactions')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await User.countDocuments(query);

    res.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ban/Unban user
router.post('/users/:userId/ban', adminAuth, async (req, res) => {
  try {
    const { reason, duration } = req.body; // duration in hours
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBlocked = true;
    if (duration) {
      user.blockedUntil = new Date(Date.now() + duration * 60 * 60 * 1000);
    }

    await user.save();

    res.json({ message: 'User banned', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:userId/unban', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBlocked = false;
    user.blockedUntil = null;
    await user.save();

    res.json({ message: 'User unbanned', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suspend user
router.post('/users/:userId/suspend', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isSuspended = true;
    user.suspensionReason = reason;
    await user.save();

    res.json({ message: 'User suspended', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify user profile
router.post('/users/:userId/verify', adminAuth, async (req, res) => {
  try {
    const { method } = req.body; // 'ai-selfie', 'manual', 'govt-id'
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isVerified = true;
    user.verificationMethod = method;
    await user.save();

    res.json({ message: 'User verified', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reports
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const chats = await Chat.find({
      reportedBy: { $exists: true }
    })
    .populate('participants', 'fullName email phone')
    .populate('reportedBy', 'fullName')
    .sort({ createdAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      lastActiveAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    const totalMatches = await Match.countDocuments();
    const totalCalls = await Call.countDocuments();
    const totalRevenue = 0; // Calculate from coin purchases

    res.json({
      totalUsers,
      activeUsers,
      totalMatches,
      totalCalls,
      totalRevenue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add coins to user (admin)
router.post('/users/:userId/coins', adminAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.addCoins(amount, 'purchased', 'Admin grant');

    res.json({ message: 'Coins added', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;




