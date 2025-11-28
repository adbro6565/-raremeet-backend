const mongoose = require('mongoose');

const swipeSchema = new mongoose.Schema({
  swiperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  swipedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['like', 'dislike', 'superlike'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000 // 30 days
  }
});

swipeSchema.index({ swiperId: 1, swipedUserId: 1 }, { unique: true });
swipeSchema.index({ swiperId: 1, createdAt: -1 });

module.exports = mongoose.model('Swipe', swipeSchema);




