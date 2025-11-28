const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ 
      where: { id: decoded.userId },
      include: {
        photos: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Account suspended', reason: user.suspensionReason });
    }

    if (user.isBlocked && user.blockedUntil && user.blockedUntil > new Date()) {
      return res.status(403).json({ error: 'Account temporarily blocked' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {});
    // Note: Add role field to User model if needed
    // For now, we'll skip role check or add it later
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Admin authorization failed' });
  }
};

module.exports = { auth, adminAuth };


