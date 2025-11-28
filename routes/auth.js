const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const prisma = require('../prismaClient');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const { antiSpamMiddleware } = require('../middleware/antiSpam');

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
  return { accessToken, refreshToken };
};

// Register with Email
router.post('/register/email', authLimiter, antiSpamMiddleware, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').trim().notEmpty(),
  body('age').isInt({ min: 18, max: 100 }),
  body('gender').isIn(['male', 'female', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName, age, gender, deviceId, referredByCode } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate referral code
    const referralCode = `REF${Date.now().toString(36).toUpperCase()}`;

    // Check if referred by code
    let referredById = null;
    if (referredByCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: referredByCode } });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        age: parseInt(age),
        gender,
        deviceId,
        referralCode,
        referredById,
        coins: 10 // Free coins on signup
      }
    });

    // If referred, give coins to referrer
    if (referredById) {
      await prisma.user.update({
        where: { id: referredById },
        data: { coins: { increment: 30 } }
      });
      await prisma.coinTransaction.create({
        data: {
          userId: referredById,
          type: 'earned',
          amount: 30,
          description: 'Referral bonus'
        }
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        coins: user.coins
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Register email error:', error);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(400).json({ 
        error: `${field === 'email' ? 'Email' : 'User'} already exists` 
      });
    }
    
    // Handle other Prisma errors
    if (error.code && error.code.startsWith('P')) {
      return res.status(400).json({ 
        error: 'Database error. Please try again.' 
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Registration failed. Please try again.' 
    });
  }
});

// Register with Phone
router.post('/register/phone', authLimiter, [
  body('phone').isMobilePhone(),
  body('fullName').trim().notEmpty(),
  body('age').isInt({ min: 18, max: 100 }),
  body('gender').isIn(['male', 'female', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join(', ');
      return res.status(400).json({ error: errorMessages || 'Validation failed' });
    }

    const { phone, fullName, age, gender, deviceId, referredByCode } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    // Generate referral code
    const referralCode = `REF${Date.now().toString(36).toUpperCase()}`;

    // Check if referred by code
    let referredById = null;
    if (referredByCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: referredByCode } });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    const user = await prisma.user.create({
      data: {
        phone,
        fullName,
        age: parseInt(age),
        gender,
        deviceId,
        referralCode,
        referredById,
        coins: 10
      }
    });

    // If referred, give coins to referrer
    if (referredById) {
      await prisma.user.update({
        where: { id: referredById },
        data: { coins: { increment: 30 } }
      });
      await prisma.coinTransaction.create({
        data: {
          userId: referredById,
          type: 'earned',
          amount: 30,
          description: 'Referral bonus'
        }
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.fullName,
        coins: user.coins
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Register phone error:', error);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(400).json({ 
        error: `${field === 'phone' ? 'Phone number' : 'User'} already exists` 
      });
    }
    
    // Handle other Prisma errors
    if (error.code && error.code.startsWith('P')) {
      return res.status(400).json({ 
        error: 'Database error. Please try again.' 
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Registration failed. Please try again.' 
    });
  }
});

// Login with Email
router.post('/login/email', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, deviceId } = req.body;

    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() }
    });
    
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Account suspended', reason: user.suspensionReason });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login and device
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
        isOnline: true,
        ...(deviceId && { deviceId })
      }
    });

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        coins: user.coins,
        isPremium: user.isPremium
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send OTP
router.post('/otp/send', otpLimiter, [
  body('phone').isMobilePhone()
], async (req, res) => {
  try {
    const { phone } = req.body;
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in Redis (or memory for dev)
    // In production, use Redis with 5-minute expiry
    // await redis.setex(`otp:${phone}`, 300, otp);
    
    // Send OTP via Twilio (implement)
    // await twilioClient.messages.create({
    //   body: `Your RareMeet OTP is: ${otp}`,
    //   to: phone,
    //   from: process.env.TWILIO_PHONE_NUMBER
    // });

    // For development, return OTP
    res.json({ 
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP and Login
router.post('/otp/verify', otpLimiter, [
  body('phone').isMobilePhone(),
  body('otp').isLength({ min: 6, max: 6 })
], async (req, res) => {
  try {
    const { phone, otp, deviceId } = req.body;

    // Verify OTP from Redis
    // const storedOtp = await redis.get(`otp:${phone}`);
    // if (storedOtp !== otp) {
    //   return res.status(400).json({ error: 'Invalid OTP' });
    // }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
        isOnline: true,
        ...(deviceId && { deviceId })
      }
    });

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.fullName,
        coins: user.coins
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Refresh Token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Forgot Password
router.post('/forgot-password', authLimiter, [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If email exists, password reset link sent' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send reset email (implement email service)
    // await sendResetEmail(user.email, resetToken);

    res.json({ 
      message: 'Password reset link sent to email',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
