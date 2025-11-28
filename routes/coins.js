const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const prisma = require('../prismaClient');

// Get coin balance and transactions
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        coinTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });
    
    res.json({
      coins: user.coins,
      transactions: user.coinTransactions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Purchase coins (IAP - requires actual payment verification)
router.post('/purchase', auth, async (req, res) => {
  try {
    const { amount, transactionId, platform, receipt, productId } = req.body;

    // Validate required fields
    if (!transactionId || !platform) {
      return res.status(400).json({ 
        error: 'Transaction ID and platform are required' 
      });
    }

    // Check if transaction already processed (prevent duplicate)
    const existingTransaction = await prisma.coinTransaction.findFirst({
      where: {
        userId: req.userId,
        description: { contains: transactionId }
      }
    });

    if (existingTransaction) {
      return res.status(400).json({ 
        error: 'This transaction has already been processed' 
      });
    }

    // Verify transaction with Apple/Google
    // In production, implement actual receipt verification:
    // - iOS: Verify with Apple App Store
    // - Android: Verify with Google Play Billing
    
    // For development, require valid transaction format
    const isDev = process.env.NODE_ENV !== 'production';
    const isValidTransaction =
      transactionId.startsWith('GPA.') ||
      transactionId.startsWith('1000') ||
      /^[a-zA-Z0-9]{20,}$/.test(transactionId) ||
      (isDev && transactionId.startsWith('DEV-'));

    if (!isValidTransaction) {
      return res.status(400).json({ 
        error: 'Invalid transaction ID format. Payment verification required.' 
      });
    }

    // Verify receipt (placeholder - implement actual verification)
    // const isValid = await verifyReceipt(platform, receipt, productId);
    // if (!isValid) {
    //   return res.status(400).json({ error: 'Payment verification failed' });
    // }

    // Only add coins after verification
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { coins: { increment: amount } }
    });

    await prisma.coinTransaction.create({
      data: {
        userId: req.userId,
        type: 'purchased',
        amount,
        description: `Coin purchase (${platform}) - ${transactionId}`
      }
    });

    res.json({
      coins: user.coins,
      message: 'Coins purchased successfully'
    });
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: error.message || 'Purchase failed' });
  }
});

// Earn coins from watching ad
router.post('/earn/ad', auth, async (req, res) => {
  try {
    // Check if user already watched ad today (implement rate limiting)
    const coinsAwarded = 5;
    
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { coins: { increment: coinsAwarded } }
    });

    await prisma.coinTransaction.create({
      data: {
        userId: req.userId,
        type: 'earned',
        amount: coinsAwarded,
        description: 'Watched rewarded ad'
      }
    });

    res.json({
      coinsAwarded,
      totalCoins: user.coins
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Use boost (spend coins)
router.post('/boost', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    
    if (user.coins < 20) {
      return res.status(400).json({ error: 'Insufficient coins. Boost costs 20 coins.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: { coins: { decrement: 20 } }
    });

    await prisma.coinTransaction.create({
      data: {
        userId: req.userId,
        type: 'spent',
        amount: 20,
        description: 'Boost - Increased visibility for 30 minutes'
      }
    });

    // Set boost expiry (implement boost logic in swipe algorithm)
    res.json({
      message: 'Boost activated',
      remainingCoins: updatedUser.coins,
      boostExpiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get coin packs (for display)
router.get('/packs', auth, async (req, res) => {
  res.json([
    { id: 1, coins: 10, price: 0.99, popular: false },
    { id: 2, coins: 25, price: 1.99, popular: false },
    { id: 3, coins: 60, price: 3.99, popular: true },
    { id: 4, coins: 120, price: 6.99, popular: false },
    { id: 5, coins: 250, price: 12.99, popular: false },
    { id: 6, coins: 500, price: 24.99, popular: false },
    { id: 7, coins: 1000, price: 44.99, popular: false }
  ]);
});

// Generic spend coins endpoint
router.post('/spend', auth, async (req, res) => {
  try {
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.coins < amount) {
      return res.status(400).json({ error: 'Insufficient coins' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: { coins: { decrement: amount } }
    });

    await prisma.coinTransaction.create({
      data: {
        userId: req.userId,
        type: 'spent',
        amount,
        description: description || 'Coins spent'
      }
    });

    res.json({
      message: 'Coins deducted',
      remainingCoins: updatedUser.coins
    });
  } catch (error) {
    console.error('Spend coins error:', error);
    res.status(500).json({ error: error.message || 'Unable to deduct coins' });
  }
});

// Female daily bonus
router.post('/female-bonus', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { gender: true, coins: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if ((user.gender || '').toLowerCase() !== 'female') {
      return res.status(400).json({ error: 'Bonus available for female hosts only' });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const existingBonus = await prisma.coinTransaction.findFirst({
      where: {
        userId: req.userId,
        description: 'Daily Glow bonus',
        createdAt: { gte: startOfDay }
      }
    });

    if (existingBonus) {
      return res.status(400).json({ error: 'Bonus already claimed today' });
    }

    const bonusAmount = 50;

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: { coins: { increment: bonusAmount } }
    });

    await prisma.coinTransaction.create({
      data: {
        userId: req.userId,
        type: 'earned',
        amount: bonusAmount,
        description: 'Daily Glow bonus'
      }
    });

    res.json({
      message: 'Bonus claimed',
      coinsAwarded: bonusAmount,
      totalCoins: updatedUser.coins
    });
  } catch (error) {
    console.error('Female bonus error:', error);
    res.status(500).json({ error: error.message || 'Unable to claim bonus' });
  }
});

module.exports = router;
