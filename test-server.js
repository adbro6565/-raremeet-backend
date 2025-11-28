require('dotenv').config();
const prisma = require('./prismaClient');

console.log('Testing Prisma connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');

prisma.$connect()
  .then(() => {
    console.log('✅ Database connected!');
    return prisma.$queryRaw`SELECT 1`;
  })
  .then(() => {
    console.log('✅ Database query successful!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Database error:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  });

