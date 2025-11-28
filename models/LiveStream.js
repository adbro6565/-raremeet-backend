const mongoose = require('mongoose');

const liveStreamSchema = new mongoose.Schema({
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    default: 'Live Stream',
  },
  status: {
    type: String,
    enum: ['live', 'ended'],
    default: 'live',
  },
  viewers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  messages: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    message: String,
    type: {
      type: String,
      enum: ['text', 'sticker', 'gift', 'reaction'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
  gifts: [{
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    giftId: Number,
    coins: Number,
    sentAt: {
      type: Date,
      default: Date.now,
    },
  }],
  totalEarnings: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: Date,
});

module.exports = mongoose.model('LiveStream', liveStreamSchema);



