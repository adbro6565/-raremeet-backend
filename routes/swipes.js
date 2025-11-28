const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { swipeLimiter } = require('../middleware/rateLimiter');
const prisma = require('../prismaClient');

// Get potential matches (smart algorithm)
router.get('/discover', auth, swipeLimiter, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const { latitude, longitude } = req.query;

    // Get already swiped users
    const swipes = await prisma.swipe.findMany({
      where: { swiperId: req.userId },
      select: { swipedUserId: true }
    });
    const swipedUserIds = swipes.map(s => s.swipedUserId);
    swipedUserIds.push(req.userId);

    // Build query conditions
    const where = {
      id: { notIn: swipedUserIds },
      isSuspended: false,
      isBlocked: false
    };

    // Age filter
    if (user.swipeMinAge || user.swipeMaxAge) {
      where.age = {
        gte: user.swipeMinAge || 18,
        lte: user.swipeMaxAge || 100
      };
    }

    // Gender filter
    if (user.swipeInterestedIn && user.swipeInterestedIn.length > 0) {
      where.gender = { in: user.swipeInterestedIn };
    }

    // Get users
    let users = await prisma.user.findMany({
      where,
      include: {
        photos: true
      },
      take: 20,
      orderBy: [
        { isOnline: 'desc' },
        { lastActiveAt: 'desc' }
      ]
    });

    // Filter users with at least one photo
    const usersWithPhotos = users.filter(u => u.photos && u.photos.length > 0);

    // If location provided, sort by distance (simple calculation)
    if (latitude && longitude && user.locationLat && user.locationLng) {
      usersWithPhotos.sort((a, b) => {
        if (!a.locationLat || !a.locationLng) return 1;
        if (!b.locationLat || !b.locationLng) return -1;
        
        const distA = Math.sqrt(
          Math.pow(a.locationLat - parseFloat(latitude), 2) +
          Math.pow(a.locationLng - parseFloat(longitude), 2)
        );
        const distB = Math.sqrt(
          Math.pow(b.locationLat - parseFloat(latitude), 2) +
          Math.pow(b.locationLng - parseFloat(longitude), 2)
        );
        return distA - distB;
      });
    }

    // Format users properly
    const formattedUsers = usersWithPhotos.map(u => ({
      id: u.id,
      _id: u.id,
      fullName: u.fullName,
      age: u.age,
      gender: u.gender,
      bio: u.bio,
      photos: u.photos || [],
      interests: Array.isArray(u.interests) ? u.interests : [],
      isVerified: u.isVerified || false,
      isOnline: u.isOnline || false,
      locationLat: u.locationLat,
      locationLng: u.locationLng,
    }));

    res.json(formattedUsers || []);
  } catch (error) {
    console.error('Discover error:', error);
    res.json([]); // Return empty array instead of error
  }
});

// Swipe action (like/dislike/superlike)
router.post('/swipe', auth, swipeLimiter, async (req, res) => {
  try {
    const { swipedUserId, action } = req.body; // action: 'like', 'dislike', 'superlike'

    if (!['like', 'dislike', 'superlike'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Check if already swiped
    const existingSwipe = await prisma.swipe.findUnique({
      where: {
        swiperId_swipedUserId: {
          swiperId: req.userId,
          swipedUserId
        }
      }
    });

    if (existingSwipe) {
      return res.status(400).json({ error: 'Already swiped on this user' });
    }

    // Get user for coin check
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    // Deduct coins for superlike
    if (action === 'superlike') {
      if (user.coins < 5) {
        return res.status(400).json({ error: 'Insufficient coins for superlike' });
      }
      
      await prisma.user.update({
        where: { id: req.userId },
        data: { coins: { decrement: 5 } }
      });

      await prisma.coinTransaction.create({
        data: {
          userId: req.userId,
          type: 'spent',
          amount: 5,
          description: 'Superlike'
        }
      });
    }

    // Create swipe record
    const swipe = await prisma.swipe.create({
      data: {
        swiperId: req.userId,
        swipedUserId,
        action
      }
    });

    // Check for match (if liked or superliked)
    if (action === 'like' || action === 'superlike') {
      const mutualSwipe = await prisma.swipe.findFirst({
        where: {
          swiperId: swipedUserId,
          swipedUserId: req.userId,
          action: { in: ['like', 'superlike'] }
        }
      });

      if (mutualSwipe) {
        // It's a match!
        const match = await prisma.match.create({
          data: {
            userAId: req.userId,
            userBId: swipedUserId,
            matchedAt: new Date()
          }
        });

        // Create chat room
        await prisma.chat.create({
          data: {
            matchId: match.id
          }
        });

        return res.json({
          match: true,
          matchId: match.id,
          message: "It's a match!"
        });
      }
    }

    res.json({ match: false, message: 'Swipe recorded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get swipe history
router.get('/history', auth, async (req, res) => {
  try {
    const swipes = await prisma.swipe.findMany({
      where: { swiperId: req.userId },
      include: {
        swipedUser: {
          select: {
            id: true,
            fullName: true,
            photos: true,
            age: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(swipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
