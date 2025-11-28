-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('ai_selfie', 'manual', 'govt_id');

-- CreateEnum
CREATE TYPE "PerformanceMode" AS ENUM ('low', 'balanced', 'high');

-- CreateEnum
CREATE TYPE "SwipeAction" AS ENUM ('like', 'dislike', 'superlike');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'image', 'file', 'voice');

-- CreateEnum
CREATE TYPE "CoinTransactionType" AS ENUM ('earned', 'spent', 'purchased');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('initiated', 'ringing', 'answered', 'ended', 'missed', 'rejected');

-- CreateEnum
CREATE TYPE "LiveStreamStatus" AS ENUM ('live', 'ended');

-- CreateEnum
CREATE TYPE "LiveMessageType" AS ENUM ('text', 'sticker', 'gift', 'reaction');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,
    "bio" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "locationCity" TEXT,
    "locationCountry" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "job" TEXT,
    "education" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationMethod" "VerificationMethod",
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumExpiresAt" TIMESTAMP(3),
    "coins" INTEGER NOT NULL DEFAULT 10,
    "lastLoginAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "deviceId" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedUntil" TIMESTAMP(3),
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "suspensionReason" TEXT,
    "swipeMinAge" INTEGER NOT NULL DEFAULT 18,
    "swipeMaxAge" INTEGER NOT NULL DEFAULT 100,
    "swipeMaxDistance" INTEGER NOT NULL DEFAULT 50,
    "swipeInterestedIn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dailyCheckInLast" TIMESTAMP(3),
    "dailyCheckInStreak" INTEGER NOT NULL DEFAULT 0,
    "referredById" TEXT,
    "referralCode" TEXT,
    "language" TEXT DEFAULT 'en',
    "disableScreenshot" BOOLEAN NOT NULL DEFAULT false,
    "performanceMode" "PerformanceMode" NOT NULL DEFAULT 'balanced',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPhoto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Swipe" (
    "id" TEXT NOT NULL,
    "swiperId" TEXT NOT NULL,
    "swipedUserId" TEXT NOT NULL,
    "action" "SwipeAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Swipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "unmatchedById" TEXT,
    "unmatchedAt" TIMESTAMP(3),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "blockedById" TEXT,
    "reportedById" TEXT,
    "reportReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'text',
    "fileUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CoinTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "matchId" TEXT,
    "status" "CallStatus" NOT NULL DEFAULT 'initiated',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "coinsDeducted" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveStream" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT DEFAULT 'Live Stream',
    "status" "LiveStreamStatus" NOT NULL DEFAULT 'live',
    "totalEarnings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "LiveStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveStreamViewer" (
    "id" TEXT NOT NULL,
    "liveStreamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveStreamViewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveStreamMessage" (
    "id" TEXT NOT NULL,
    "liveStreamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LiveMessageType" NOT NULL,
    "content" TEXT,
    "emoji" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveStreamMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveStreamGift" (
    "id" TEXT NOT NULL,
    "liveStreamId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "giftId" INTEGER NOT NULL,
    "coins" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveStreamGift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "UserPhoto_userId_idx" ON "UserPhoto"("userId");

-- CreateIndex
CREATE INDEX "Swipe_swiperId_createdAt_idx" ON "Swipe"("swiperId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Swipe_swiperId_swipedUserId_key" ON "Swipe"("swiperId", "swipedUserId");

-- CreateIndex
CREATE INDEX "Match_userAId_idx" ON "Match"("userAId");

-- CreateIndex
CREATE INDEX "Match_userBId_idx" ON "Match"("userBId");

-- CreateIndex
CREATE INDEX "Match_matchedAt_idx" ON "Match"("matchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Chat_matchId_key" ON "Chat"("matchId");

-- CreateIndex
CREATE INDEX "Chat_lastMessageAt_idx" ON "Chat"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatMessage_chatId_createdAt_idx" ON "ChatMessage"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "CoinTransaction_userId_createdAt_idx" ON "CoinTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Call_callerId_createdAt_idx" ON "Call"("callerId", "createdAt");

-- CreateIndex
CREATE INDEX "Call_receiverId_createdAt_idx" ON "Call"("receiverId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveStream_hostId_createdAt_idx" ON "LiveStream"("hostId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveStreamViewer_liveStreamId_idx" ON "LiveStreamViewer"("liveStreamId");

-- CreateIndex
CREATE INDEX "LiveStreamViewer_userId_idx" ON "LiveStreamViewer"("userId");

-- CreateIndex
CREATE INDEX "LiveStreamMessage_liveStreamId_createdAt_idx" ON "LiveStreamMessage"("liveStreamId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveStreamGift_liveStreamId_idx" ON "LiveStreamGift"("liveStreamId");

-- CreateIndex
CREATE INDEX "LiveStreamGift_fromUserId_idx" ON "LiveStreamGift"("fromUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPhoto" ADD CONSTRAINT "UserPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Swipe" ADD CONSTRAINT "Swipe_swiperId_fkey" FOREIGN KEY ("swiperId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Swipe" ADD CONSTRAINT "Swipe_swipedUserId_fkey" FOREIGN KEY ("swipedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_unmatchedById_fkey" FOREIGN KEY ("unmatchedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveStream" ADD CONSTRAINT "LiveStream_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveStreamViewer" ADD CONSTRAINT "LiveStreamViewer_liveStreamId_fkey" FOREIGN KEY ("liveStreamId") REFERENCES "LiveStream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveStreamViewer" ADD CONSTRAINT "LiveStreamViewer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveStreamMessage" ADD CONSTRAINT "LiveStreamMessage_liveStreamId_fkey" FOREIGN KEY ("liveStreamId") REFERENCES "LiveStream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveStreamMessage" ADD CONSTRAINT "LiveStreamMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveStreamGift" ADD CONSTRAINT "LiveStreamGift_liveStreamId_fkey" FOREIGN KEY ("liveStreamId") REFERENCES "LiveStream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveStreamGift" ADD CONSTRAINT "LiveStreamGift_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
