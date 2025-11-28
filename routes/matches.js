const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const prisma = require('../prismaClient');

// Get all matches
router.get('/', auth, async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { userAId: req.userId },
          { userBId: req.userId }
        ],
        isActive: true
      },
      include: {
        userA: {
          select: {
            id: true,
            fullName: true,
            photos: true,
            age: true,
            isOnline: true,
            lastActiveAt: true
          }
        },
        userB: {
          select: {
            id: true,
            fullName: true,
            photos: true,
            age: true,
            isOnline: true,
            lastActiveAt: true
          }
        }
      },
      orderBy: { matchedAt: 'desc' }
    });

    // Format matches to show the other user
    const formattedMatches = matches.map(match => {
      const otherUser = match.userAId === req.userId ? match.userB : match.userA;
      return {
        id: match.id,
        _id: match.id,
        user: {
          ...otherUser,
          id: otherUser.id,
          _id: otherUser.id,
          photos: otherUser.photos || [],
        },
        matchedAt: match.matchedAt,
        lastMessageAt: match.lastMessageAt
      };
    });

    res.json(formattedMatches || []);
  } catch (error) {
    console.error('Get matches error:', error);
    res.json([]); // Return empty array instead of error
  }
});

// Get match by ID
router.get('/:matchId', auth, async (req, res) => {
  try {
    const match = await prisma.match.findFirst({
      where: {
        id: req.params.matchId,
        OR: [
          { userAId: req.userId },
          { userBId: req.userId }
        ],
        isActive: true
      },
      include: {
        userA: {
          select: {
            id: true,
            fullName: true,
            photos: true,
            age: true,
            isOnline: true
          }
        },
        userB: {
          select: {
            id: true,
            fullName: true,
            photos: true,
            age: true,
            isOnline: true
          }
        }
      }
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const otherUser = match.userAId === req.userId ? match.userB : match.userA;

    res.json({
      id: match.id,
      user: otherUser,
      matchedAt: match.matchedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unmatch
router.post('/:matchId/unmatch', auth, async (req, res) => {
  try {
    const match = await prisma.match.findFirst({
      where: {
        id: req.params.matchId,
        OR: [
          { userAId: req.userId },
          { userBId: req.userId }
        ]
      }
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    await prisma.match.update({
      where: { id: match.id },
      data: {
        isActive: false,
        unmatchedById: req.userId,
        unmatchedAt: new Date()
      }
    });

    // Delete associated chat
    await prisma.chat.deleteMany({
      where: { matchId: match.id }
    });

    res.json({ message: 'Unmatched successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
