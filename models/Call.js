const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  callerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'answered', 'ended', 'missed', 'rejected'],
    default: 'initiated'
  },
  startedAt: Date,
  endedAt: Date,
  duration: Number, // in seconds
  coinsDeducted: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

callSchema.index({ callerId: 1, createdAt: -1 });
callSchema.index({ receiverId: 1, createdAt: -1 });

module.exports = mongoose.model('Call', callSchema);




