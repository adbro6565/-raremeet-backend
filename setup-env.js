const fs = require('fs');
const path = require('path');

const envContent = `PORT=5000
MONGODB_URI=mongodb+srv://adbrother22111:YMaihdKIi81tX9do@cluster0.48uxtme.mongodb.net/raremeet?retryWrites=true&w=majority
DATABASE_URL="postgresql://postgres:Dhar%40%23$12345@db.arrnisqidskbpltsfcms.supabase.co:5432/postgres"
JWT_SECRET=raremeet-super-secret-jwt-key-2024-change-in-production
JWT_REFRESH_SECRET=raremeet-refresh-token-secret-2024-change-in-production
NODE_ENV=development

# Cloudinary (Optional - for image uploads)
# CLOUDINARY_CLOUD_NAME=your-cloud-name
# CLOUDINARY_API_KEY=your-api-key
# CLOUDINARY_API_SECRET=your-api-secret

# Redis (Optional - for caching)
# REDIS_URL=redis://localhost:6379

# Twilio (Optional - for OTP)
# TWILIO_ACCOUNT_SID=your-twilio-sid
# TWILIO_AUTH_TOKEN=your-twilio-token
# TWILIO_PHONE_NUMBER=+1234567890

# Firebase Admin (for push notifications)
FIREBASE_PROJECT_ID=studio-3141537107-b52b7
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# STUN/TURN Servers (Optional - for video calls)
STUN_SERVER=stun:stun.l.google.com:19302
# TURN_SERVER=turn:your-turn-server.com:3478
# TURN_USERNAME=your-turn-username
# TURN_CREDENTIAL=your-turn-password

# LiveKit (for real-time video & live streaming)
LIVEKIT_URL=wss://dharam-bfo9y1k0.livekit.cloud
LIVEKIT_API_KEY=APIvT3sM96n7Gis
LIVEKIT_API_SECRET=CtL7Qcq5LiJPNbRFhYxg9b2dftI5geKMe3Ddq7FTLeRA
`;

const envPath = path.join(__dirname, '.env');

fs.writeFileSync(envPath, envContent);
console.log('✅ .env file updated successfully!');

