const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { antiSpamMiddleware } = require('../middleware/antiSpam');
const prisma = require('../prismaClient');

const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_SELFIE_BYTES = 4 * 1024 * 1024; // 4 MB

const getDataUrlSize = (dataUrl = '') => {
  try {
    const base64 = dataUrl.split(',')[1] || dataUrl;
    return Math.floor((base64.length * 3) / 4);
  } catch (error) {
    return Number.MAX_SAFE_INTEGER;
  }
};

const isImageDataUrl = (value = '') => /^data:image\/(png|jpe?g);base64,/i.test(value);

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        photos: true,
        referredBy: {
          select: { id: true, fullName: true, referralCode: true }
        }
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.put('/me', auth, antiSpamMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      'fullName',
      'bio',
      'age',
      'interests',
      'job',
      'education',
      'swipeMinAge',
      'swipeMaxAge',
      'swipeMaxDistance',
      'swipeInterestedIn',
      'language',
      'disableScreenshot',
      'performanceMode',
      'locationLat',
      'locationLng',
      'locationCity',
      'locationCountry',
    ];
    
    const updateData = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateData[key] = updates[key];
      }
    });

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      include: { photos: true }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload photo
router.post('/me/photos', auth, async (req, res) => {
  try {
    const { photoUrl, isPrimary } = req.body;

    if (!photoUrl) {
      return res.status(400).json({ error: 'Photo data is required' });
    }

    const normalizedPhoto = photoUrl.trim();
    if (!isImageDataUrl(normalizedPhoto)) {
      return res.status(400).json({ error: 'Unsupported photo format. Please use JPG or PNG.' });
    }

    const photoBytes = getDataUrlSize(normalizedPhoto);
    if (photoBytes > MAX_PROFILE_PHOTO_BYTES) {
      return res
        .status(413)
        .json({ error: 'Photo is too large. Please upload an image under 5 MB.' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { photos: true }
    });

    if (user.photos.length >= 6) {
      return res.status(400).json({ error: 'Maximum 6 photos allowed' });
    }

    if (isPrimary) {
      await prisma.userPhoto.updateMany({
        where: { userId: req.userId },
        data: { isPrimary: false }
      });
    }

    await prisma.userPhoto.create({
      data: {
        userId: req.userId,
        url: normalizedPhoto,
        isPrimary: isPrimary || user.photos.length === 0
      }
    });

    const updatedPhotos = await prisma.userPhoto.findMany({
      where: { userId: req.userId },
      orderBy: { uploadedAt: 'asc' },
    });

    res.json({ photos: updatedPhotos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete photo
router.delete('/me/photos/:photoId', auth, async (req, res) => {
  try {
    await prisma.userPhoto.delete({
      where: { 
        id: req.params.photoId,
        userId: req.userId // Ensure user owns the photo
      }
    });
    
    const photos = await prisma.userPhoto.findMany({
      where: { userId: req.userId }
    });
    
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get similar users (based on interests)
router.get('/similar', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    
    if (!user) {
      return res.json([]);
    }
    
    const similarUsers = await prisma.user.findMany({
      where: {
        id: { not: req.userId },
        isSuspended: false,
      },
      select: {
        id: true,
        fullName: true,
        age: true,
        photos: { take: 1 },
        interests: true,
        isVerified: true,
        isOnline: true,
      },
      take: 20,
      orderBy: { lastActiveAt: 'desc' }
    });

    const formattedUsers = similarUsers.map(u => ({
      id: u.id,
      _id: u.id,
      fullName: u.fullName,
      age: u.age,
      isVerified: u.isVerified || false,
      isOnline: u.isOnline || false,
      interests: Array.isArray(u.interests) ? u.interests : [],
      photos: u.photos.map(p => ({ url: p.url, isPrimary: p.isPrimary }))
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Get similar users error:', error);
    res.json([]);
  }
});

// Get user by ID (for viewing profiles)
router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        age: true,
        gender: true,
        bio: true,
        locationLat: true,
        locationLng: true,
        locationCity: true,
        locationCountry: true,
        interests: true,
        job: true,
        education: true,
        isVerified: true,
        verificationMethod: true,
        isPremium: true,
        createdAt: true,
        photos: {
          select: {
            id: true,
            url: true,
            isPrimary: true,
            uploadedAt: true
          },
          orderBy: { uploadedAt: 'asc' }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update location
router.put('/me/location', auth, async (req, res) => {
  try {
    const { latitude, longitude, city, country } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        locationLat: latitude,
        locationLng: longitude,
        locationCity: city,
        locationCountry: country
      }
    });
    
    res.json({
      locationLat: user.locationLat,
      locationLng: user.locationLng,
      locationCity: user.locationCity,
      locationCountry: user.locationCountry
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update online status
router.put('/me/online', auth, async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        isOnline: req.body.isOnline || false,
        lastActiveAt: new Date()
      }
    });
    res.json({ isOnline: user.isOnline, lastActiveAt: user.lastActiveAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Daily check-in
router.post('/me/checkin', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const lastCheckIn = user.dailyCheckInLast;
    const lastCheckInDate = lastCheckIn ? new Date(lastCheckIn) : null;
    if (lastCheckInDate) lastCheckInDate.setHours(0, 0, 0, 0);

    if (lastCheckInDate && lastCheckInDate.getTime() === today.getTime()) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    // Check streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let newStreak = 1;
    if (lastCheckInDate && lastCheckInDate.getTime() === yesterday.getTime()) {
      newStreak = user.dailyCheckInStreak + 1;
    }
    
    // Award coins based on streak
    let coinsAwarded = 5; // Base coins
    if (newStreak >= 7) coinsAwarded = 20;
    else if (newStreak >= 3) coinsAwarded = 10;

    // Update user and create transaction
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        dailyCheckInLast: new Date(),
        dailyCheckInStreak: newStreak,
        coins: { increment: coinsAwarded }
      }
    });

    await prisma.coinTransaction.create({
      data: {
        userId: req.userId,
        type: 'earned',
        amount: coinsAwarded,
        description: `Daily check-in (streak: ${newStreak})`
      }
    });

    res.json({
      streak: newStreak,
      coinsAwarded,
      totalCoins: updatedUser.coins
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit selfie verification
router.post('/me/verify', auth, async (req, res) => {
  try {
    const { selfieUri } = req.body;

    if (!selfieUri) {
      return res.status(400).json({ error: 'Selfie data is required' });
    }

    const normalizedSelfie = selfieUri.trim();
    if (!isImageDataUrl(normalizedSelfie)) {
      return res.status(400).json({ error: 'Unsupported selfie format. Please use JPG or PNG.' });
    }

    const selfieBytes = getDataUrlSize(normalizedSelfie);
    if (selfieBytes > MAX_SELFIE_BYTES) {
      return res
        .status(413)
        .json({ error: 'Selfie is too large. Please retake with lower resolution (max 4 MB).' });
    }

    // Set all existing photos to non-primary so selfie can replace
    await prisma.userPhoto.updateMany({
      where: { userId: req.userId },
      data: { isPrimary: false },
    });

    const selfiePhoto = await prisma.userPhoto.create({
      data: {
        userId: req.userId,
        url: normalizedSelfie,
        isPrimary: true,
      },
    });

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        isVerified: true,
        verificationMethod: 'ai_selfie',
      },
      include: {
        photos: true,
      },
    });

    res.json({
      message: 'Verification submitted successfully',
      photo: selfiePhoto,
      user,
    });
  } catch (error) {
    console.error('Selfie verification error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit verification selfie' });
  }
});

// Get follow stats
router.get('/me/follow-stats', auth, async (req, res) => {
  try {
    // This would need a Follow model - for now return mock data
    res.json({
      followers: 0,
      following: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get followers list
router.get('/me/followers', auth, async (req, res) => {
  try {
    // This would need a Follow model - for now return empty
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get following list
router.get('/me/following', auth, async (req, res) => {
  try {
    // This would need a Follow model - for now return empty
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Follow a user
router.post('/:userId/follow', auth, async (req, res) => {
  try {
    // This would need a Follow model - for now just return success
    res.json({ message: 'User followed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate account
router.post('/me/deactivate', auth, async (req, res) => {
  try {
    const reason = req.body?.reason || 'User requested account deletion';

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        isSuspended: true,
        suspensionReason: reason,
        isOnline: false,
        passwordHash: null,
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Referral code usage
router.post('/refer/:referralCode', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    
    if (user.referredById) {
      return res.status(400).json({ error: 'Already used a referral code' });
    }

    const referrer = await prisma.user.findUnique({ 
      where: { referralCode: req.params.referralCode }
    });
    
    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    if (referrer.id === req.userId) {
      return res.status(400).json({ error: 'Cannot use your own referral code' });
    }

    // Update user and award coins
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        referredById: referrer.id,
        coins: { increment: 30 }
      }
    });

    await prisma.user.update({
      where: { id: referrer.id },
      data: { coins: { increment: 30 } }
    });

    // Create transactions
    await prisma.coinTransaction.createMany({
      data: [
        {
          userId: req.userId,
          type: 'earned',
          amount: 30,
          description: 'Referral bonus'
        },
        {
          userId: referrer.id,
          type: 'earned',
          amount: 30,
          description: 'Referral reward'
        }
      ]
    });

    res.json({ message: 'Referral code applied successfully', coinsAwarded: 30 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

