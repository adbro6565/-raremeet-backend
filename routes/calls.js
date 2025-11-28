const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const prisma = require('../prismaClient');

// Initiate call
router.post('/initiate', auth, async (req, res) => {
  try {
    const { receiverId, matchId } = req.body;

    // Check if users are matched
    if (matchId) {
      const match = await prisma.match.findFirst({
        where: {
          id: matchId,
          OR: [
            { userAId: req.userId, userBId: receiverId },
            { userAId: receiverId, userBId: req.userId }
          ],
          isActive: true
        }
      });

      if (!match) {
        return res.status(403).json({ error: 'Users must be matched to call' });
      }
    }

    // Check coins (10 coins per minute, minimum 10 coins)
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user.coins < 10) {
      return res.status(400).json({ error: 'Insufficient coins. Minimum 10 coins required.' });
    }

    const call = await prisma.call.create({
      data: {
        callerId: req.userId,
        receiverId,
        matchId,
        status: 'initiated',
        startedAt: new Date()
      }
    });

    // Emit via Socket.IO (handled in server.js)
    res.json({
      callId: call.id,
      message: 'Call initiated'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// End call and deduct coins
router.post('/:callId/end', auth, async (req, res) => {
  try {
    const { duration } = req.body; // duration in seconds
    const call = await prisma.call.findUnique({
      where: { id: req.params.callId }
    });

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (call.callerId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Calculate coins (10 coins per minute, minimum 1 minute)
    const minutes = Math.max(1, Math.ceil(duration / 60));
    const coinsToDeduct = minutes * 10;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    let coinsDeducted = 0;

    if (user.coins >= coinsToDeduct) {
      await prisma.user.update({
        where: { id: req.userId },
        data: { coins: { decrement: coinsToDeduct } }
      });

      await prisma.coinTransaction.create({
        data: {
          userId: req.userId,
          type: 'spent',
          amount: coinsToDeduct,
          description: `Video call (${minutes} min)`
        }
      });

      coinsDeducted = coinsToDeduct;
    }

    const updatedCall = await prisma.call.update({
      where: { id: req.params.callId },
      data: {
        status: 'ended',
        endedAt: new Date(),
        duration,
        coinsDeducted
      }
    });

    const updatedUser = await prisma.user.findUnique({ where: { id: req.userId } });

    res.json({
      coinsDeducted,
      remainingCoins: updatedUser.coins
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get call history
router.get('/history', auth, async (req, res) => {
  try {
    const calls = await prisma.call.findMany({
      where: {
        OR: [
          { callerId: req.userId },
          { receiverId: req.userId }
        ]
      },
      include: {
        caller: {
          select: {
            id: true,
            fullName: true,
            photos: true
          }
        },
        receiver: {
          select: {
            id: true,
            fullName: true,
            photos: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(calls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
