const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const prisma = require('../prismaClient');

// Start live stream
router.post('/start', auth, async (req, res) => {
  try {
    const stream = await prisma.liveStream.create({
      data: {
        hostId: req.userId,
        title: req.body.title || 'Live Stream',
        status: 'live'
      },
      include: {
        host: {
          select: {
            id: true,
            fullName: true,
            photos: true
          }
        }
      }
    });
    
    res.json({ streamId: stream.id, stream });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all live streams
router.get('/streams', auth, async (req, res) => {
  try {
    const staleCutoff = new Date(Date.now() - 10 * 60 * 1000);

    const streams = await prisma.liveStream.findMany({
      where: {
        status: 'live',
        OR: [
          { endedAt: null },
          { endedAt: { gt: staleCutoff } }
        ]
      },
      include: {
        host: {
          select: {
            id: true,
            fullName: true,
            photos: {
              take: 1
            }
          }
        },
        viewers: {
          take: 10,
          select: {
            id: true,
            user: {
              select: {
                id: true,
                fullName: true,
                photos: {
                  take: 1
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    const streamsWithViewers = streams.map(stream => ({
      id: stream.id,
      _id: stream.id,
      hostId: stream.hostId,
      title: stream.title || 'Live Stream',
      status: stream.status,
      totalEarnings: stream.totalEarnings || 0,
      createdAt: stream.createdAt,
      host: stream.host || { id: stream.hostId, fullName: 'Host', photos: [] },
      viewers: stream.viewers?.length || 0,
      viewersList: stream.viewers?.map((viewer) => ({
        id: viewer.id,
        user: viewer.user
          ? {
              id: viewer.user.id,
              fullName: viewer.user.fullName,
              photos: viewer.user.photos || []
            }
          : null,
      })) || []
    }));
    
    res.json(streamsWithViewers || []);
  } catch (error) {
    console.error('Get streams error:', error);
    res.json([]); // Return empty array instead of error
  }
});

// End live stream
router.post('/end', auth, async (req, res) => {
  try {
    const stream = await prisma.liveStream.findFirst({
      where: {
        id: req.body.streamId,
        hostId: req.userId
      }
    });
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    const updatedStream = await prisma.liveStream.update({
      where: { id: stream.id },
      data: {
        status: 'ended',
        endedAt: new Date()
      }
    });
    
    res.json({ message: 'Stream ended', earnings: updatedStream.totalEarnings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send gift
router.post('/gift', auth, async (req, res) => {
  try {
    const { streamId, giftId, coins } = req.body;
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId }
    });
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    // Check user has enough coins
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user.coins < coins) {
      return res.status(400).json({ error: 'Insufficient coins' });
    }

    // Deduct coins from sender
    await prisma.user.update({
      where: { id: req.userId },
      data: { coins: { decrement: coins } }
    });

    // Add coins to host
    await prisma.user.update({
      where: { id: stream.hostId },
      data: { coins: { increment: coins } }
    });

    // Create gift record
    await prisma.liveStreamGift.create({
      data: {
        liveStreamId: streamId,
        fromUserId: req.userId,
        giftId,
        coins
      }
    });

    // Update stream earnings
    const updatedStream = await prisma.liveStream.update({
      where: { id: streamId },
      data: { totalEarnings: { increment: coins } }
    });
    
    res.json({ message: 'Gift sent', totalEarnings: updatedStream.totalEarnings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
