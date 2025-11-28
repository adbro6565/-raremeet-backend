const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const prisma = require('./prismaClient');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check endpoint (before DB connection)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test Prisma connection
async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL (Prisma) Connected');
    
    // Test query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection verified');
    
    // Routes
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/users', require('./routes/users'));
    app.use('/api/swipes', require('./routes/swipes'));
    app.use('/api/matches', require('./routes/matches'));
    app.use('/api/chat', require('./routes/chat'));
    app.use('/api/calls', require('./routes/calls'));
    app.use('/api/coins', require('./routes/coins'));
    app.use('/api/admin', require('./routes/admin'));
    app.use('/api/notifications', require('./routes/notifications'));
    app.use('/api/live', require('./routes/live'));

    // Socket.IO for real-time chat, calls, and live streams
    const liveStreams = new Map(); // streamId -> Set of socketIds

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Join user room
      socket.on('join-user', (userId) => {
        socket.join(`user-${userId}`);
        socket.userId = userId;
      });

      // Chat events
      socket.on('send-message', async (data) => {
        const { chatId, message, senderId, receiverId } = data;
        // Save message to DB (handled in chat routes)
        io.to(`user-${receiverId}`).emit('new-message', {
          chatId,
          message,
          senderId
        });
      });

      socket.on('typing', (data) => {
        socket.to(`user-${data.receiverId}`).emit('user-typing', {
          chatId: data.chatId,
          userId: data.senderId
        });
      });

      socket.on('stop-typing', (data) => {
        socket.to(`user-${data.receiverId}`).emit('user-stopped-typing', {
          chatId: data.chatId,
          userId: data.senderId
        });
      });

      // Video call events
      socket.on('call-user', (data) => {
        io.to(`user-${data.receiverId}`).emit('incoming-call', {
          callerId: data.callerId,
          callerName: data.callerName,
          callId: data.callId
        });
      });

      socket.on('answer-call', (data) => {
        io.to(`user-${data.callerId}`).emit('call-answered', {
          answer: data.answer,
          callId: data.callId
        });
      });

      socket.on('end-call', (data) => {
        io.to(`user-${data.receiverId}`).emit('call-ended', {
          callId: data.callId
        });
      });

      socket.on('ice-candidate', (data) => {
        socket.to(`user-${data.receiverId}`).emit('ice-candidate', {
          candidate: data.candidate,
          callId: data.callId
        });
      });

      // Live stream events
      socket.on('join-live', (data) => {
        const { streamId, userId } = data;
        socket.join(`live-${streamId}`);
        
        if (!liveStreams.has(streamId)) {
          liveStreams.set(streamId, new Set());
        }
        liveStreams.get(streamId).add(socket.id);
        
        // Broadcast viewer count
        const viewerCount = liveStreams.get(streamId).size;
        io.to(`live-${streamId}`).emit('viewer-count', {
          count: viewerCount,
          streamId
        });
      });

      socket.on('leave-live', (data) => {
        const { streamId } = data;
        socket.leave(`live-${streamId}`);
        
        if (liveStreams.has(streamId)) {
          liveStreams.get(streamId).delete(socket.id);
          const viewerCount = liveStreams.get(streamId).size;
          io.to(`live-${streamId}`).emit('viewer-count', {
            count: viewerCount,
            streamId
          });
        }
      });

      socket.on('live-message', (data) => {
        const { streamId, message } = data;
        io.to(`live-${streamId}`).emit('live-message', message);
      });

      socket.on('send-gift', (data) => {
        const { streamId, gift, userId, userName, coins } = data;
        io.to(`live-${streamId}`).emit('gift-received', {
          user: { _id: userId, fullName: userName },
          gift,
          coins
        });
      });

      socket.on('live-reaction', (data) => {
        const { streamId, emoji, userId, userName } = data;
        io.to(`live-${streamId}`).emit('reaction', {
          user: { _id: userId, fullName: userName },
          emoji
        });
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Remove from all live streams
        liveStreams.forEach((sockets, streamId) => {
          if (sockets.has(socket.id)) {
            sockets.delete(socket.id);
            const viewerCount = sockets.size;
            io.to(`live-${streamId}`).emit('viewer-count', {
              count: viewerCount,
              streamId
            });
          }
        });
      });
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 API URL: http://192.168.29.204:${PORT}/api`);
      console.log(`🔌 Socket URL: http://192.168.29.204:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    console.error('Please check:');
    console.error('1. DATABASE_URL in .env file');
    console.error('2. Prisma client generated (run: npx prisma generate)');
    console.error('3. Database is accessible');
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, io };


