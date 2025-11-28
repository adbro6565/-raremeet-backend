const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { antiSpamMiddleware } = require('../middleware/antiSpam');
const prisma = require('../prismaClient');

// Get or create chat for a match
router.get('/match/:matchId', auth, async (req, res) => {
  try {
    const match = await prisma.match.findFirst({
      where: {
        id: req.params.matchId,
        OR: [
          { userAId: req.userId },
          { userBId: req.userId }
        ],
        isActive: true
      }
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    let chat = await prisma.chat.findUnique({
      where: { matchId: req.params.matchId }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          matchId: req.params.matchId
        }
      });
    }

    // Format chat with both id and _id for compatibility
    const formattedChat = {
      ...chat,
      id: chat.id,
      _id: chat.id,
    };

    res.json(formattedChat);
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: error.message || 'Chat not found' });
  }
});

// Send message
router.post('/:chatId/message', auth, antiSpamMiddleware, async (req, res) => {
  try {
    const { message, type, fileUrl } = req.body;
    const chat = await prisma.chat.findUnique({
      where: { id: req.params.chatId },
      include: { match: true }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check if user is part of the match
    if (chat.match.userAId !== req.userId && chat.match.userBId !== req.userId) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    if (chat.blockedById && chat.blockedById !== req.userId) {
      return res.status(403).json({ error: 'Chat is blocked' });
    }

    const chatMessage = await prisma.chatMessage.create({
      data: {
        chatId: req.params.chatId,
        senderId: req.userId,
        message,
        type: type || 'text',
        fileUrl
      }
    });

    await prisma.chat.update({
      where: { id: req.params.chatId },
      data: { lastMessageAt: new Date() }
    });

    await prisma.match.update({
      where: { id: chat.matchId },
      data: { lastMessageAt: new Date() }
    });

    // Emit via Socket.IO (handled in server.js)
    res.json(chatMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages
router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    const chat = await prisma.chat.findUnique({
      where: { id: req.params.chatId },
      include: { 
        match: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100
        }
      }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check if user is part of the match
    if (chat.match.userAId !== req.userId && chat.match.userBId !== req.userId) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { chatId: req.params.chatId },
      orderBy: { createdAt: 'asc' },
      take: 100
    });

    // Format messages with both id and _id for compatibility
    const formattedMessages = messages.map(msg => ({
      ...msg,
      _id: msg.id,
      id: msg.id,
    }));

    res.json(formattedMessages || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
router.put('/:chatId/read', auth, async (req, res) => {
  try {
    const chat = await prisma.chat.findUnique({
      where: { id: req.params.chatId },
      include: { match: true }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check if user is part of the match
    if (chat.match.userAId !== req.userId && chat.match.userBId !== req.userId) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    // Mark all messages from other users as read
    await prisma.chatMessage.updateMany({
      where: {
        chatId: req.params.chatId,
        senderId: { not: req.userId },
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Block user in chat
router.post('/:chatId/block', auth, async (req, res) => {
  try {
    const chat = await prisma.chat.findUnique({
      where: { id: req.params.chatId },
      include: { match: true }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check if user is part of the match
    if (chat.match.userAId !== req.userId && chat.match.userBId !== req.userId) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    await prisma.chat.update({
      where: { id: req.params.chatId },
      data: { blockedById: req.userId }
    });

    res.json({ message: 'User blocked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report user
router.post('/:chatId/report', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const chat = await prisma.chat.findUnique({
      where: { id: req.params.chatId },
      include: { match: true }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check if user is part of the match
    if (chat.match.userAId !== req.userId && chat.match.userBId !== req.userId) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    await prisma.chat.update({
      where: { id: req.params.chatId },
      data: {
        reportedById: req.userId,
        reportReason: reason
      }
    });

    // Notify admin (implement admin notification)

    res.json({ message: 'User reported' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
