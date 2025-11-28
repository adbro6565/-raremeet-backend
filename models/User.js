const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  password: {
    type: String,
    select: false
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 18,
    max: 100
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  photos: [{
    url: String,
    isPrimary: Boolean,
    uploadedAt: Date
  }],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    city: String,
    country: String
  },
  interests: [{
    type: String
  }],
  job: String,
  education: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['ai-selfie', 'manual', 'govt-id', null],
    default: null
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumExpiresAt: Date,
  coins: {
    type: Number,
    default: 10 // Free coins on signup
  },
  coinTransactions: [{
    type: {
      type: String,
      enum: ['earned', 'spent', 'purchased']
    },
    amount: Number,
    description: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastLoginAt: Date,
  lastActiveAt: Date,
  isOnline: {
    type: Boolean,
    default: false
  },
  deviceId: String,
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedUntil: Date,
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: String,
  swipePreferences: {
    minAge: { type: Number, default: 18 },
    maxAge: { type: Number, default: 100 },
    maxDistance: { type: Number, default: 50 }, // km
    interestedIn: [{
      type: String,
      enum: ['male', 'female', 'other']
    }]
  },
  dailyCheckIn: {
    lastCheckIn: Date,
    streak: { type: Number, default: 0 }
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCode: {
    type: String,
    unique: true
  },
  language: {
    type: String,
    default: 'en'
  },
  disableScreenshot: {
    type: Boolean,
    default: false
  },
  performanceMode: {
    type: String,
    enum: ['low', 'balanced', 'high'],
    default: 'balanced'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
// Note: phone and referralCode already have unique: true which creates indexes automatically
userSchema.index({ location: '2dsphere' });
userSchema.index({ email: 1 });
userSchema.index({ lastActiveAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Generate referral code
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = `REF${this._id.toString().slice(-8).toUpperCase()}`;
  }
  next();
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.addCoins = function(amount, type, description) {
  this.coins += amount;
  this.coinTransactions.push({
    type,
    amount,
    description,
    createdAt: new Date()
  });
  return this.save();
};

userSchema.methods.deductCoins = function(amount, description) {
  if (this.coins < amount) {
    throw new Error('Insufficient coins');
  }
  this.coins -= amount;
  this.coinTransactions.push({
    type: 'spent',
    amount: -amount,
    description,
    createdAt: new Date()
  });
  return this.save();
};

module.exports = mongoose.model('User', userSchema);

