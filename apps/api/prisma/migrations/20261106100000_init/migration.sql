-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'COACH', 'ADMIN');

-- CreateEnum
CREATE TYPE "Format" AS ENUM ('MTT', 'SPIN', 'CASH');

-- CreateEnum
CREATE TYPE "CourseFormat" AS ENUM ('MTT', 'SPIN', 'CASH', 'MENTAL', 'ALL');

-- CreateEnum
CREATE TYPE "LessonFormat" AS ENUM ('MTT', 'SPIN', 'CASH', 'MENTAL');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('MICRO', 'LOW', 'MID', 'HIGH');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PlanId" AS ENUM ('base', 'pro', 'elite');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('month', 'year');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ID_CARD', 'PASSPORT', 'DRIVING_LICENSE');

-- CreateEnum
CREATE TYPE "KycProvider" AS ENUM ('MANUAL', 'VERIFF', 'SUMSUB', 'DIDIT', 'ONFIDO');

-- CreateEnum
CREATE TYPE "KycFileKind" AS ENUM ('FRONT', 'BACK', 'SELFIE');

-- CreateEnum
CREATE TYPE "KycAccessAction" AS ENUM ('URL_ISSUED', 'FILE_SERVED', 'REVIEWED', 'FILES_PURGED', 'PROVIDER_WEBHOOK');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'MANUAL', 'DEMO');

-- CreateEnum
CREATE TYPE "VideoProvider" AS ENUM ('NONE', 'BUNNY');

-- CreateEnum
CREATE TYPE "XpEventType" AS ENUM ('SESSION_LOGGED', 'STUDY_HOURS', 'LESSON_ATTENDED', 'HAND_REVIEW_SUBMITTED', 'DAILY_SPOT_CORRECT', 'DAILY_SPOT_STREAK', 'DEEP_RUN', 'ROAST_VOTE', 'GAMING_NIGHT', 'COURSE_COMPLETED', 'BOUNTY_WON');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "BadgeRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "RoastVoteKind" AS ENUM ('WORST', 'BEST');

-- CreateEnum
CREATE TYPE "DeepRunStatus" AS ENUM ('LIVE', 'FINAL_TABLE', 'BUSTED', 'WON');

-- CreateEnum
CREATE TYPE "GamingEventKind" AS ENUM ('NIGHT', 'BOUNTY_1V1', 'TOURNAMENT');

-- CreateEnum
CREATE TYPE "HandReviewStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'REVIEWED');

-- CreateEnum
CREATE TYPE "StakingStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('TRANSFER_TO_PLAYER', 'RETURN_FROM_PLAYER', 'SESSION_RESULT', 'SETTLEMENT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TxCategory" AS ENUM ('MEMBERSHIP', 'COURSE', 'GROUP_LESSON', 'COACHING_1V1', 'STAKING', 'SPONSOR', 'TOOLS', 'HOSTING', 'MARKETING', 'VIDEO_PRODUCTION', 'COACH_PAYOUT', 'TRAVEL', 'KYC', 'FEES', 'TAXES', 'OTHER');

-- CreateEnum
CREATE TYPE "TxSource" AS ENUM ('MANUAL', 'STRIPE', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "avatarSeed" TEXT NOT NULL,
    "formats" "Format"[],
    "mainLevel" "Level" NOT NULL DEFAULT 'MICRO',
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NONE',
    "plan" "PlanId",
    "planInterval" "BillingInterval",
    "coachId" TEXT,
    "discordHandle" TEXT,
    "gamingTag" TEXT,
    "bio" TEXT,
    "shareResultsPublicly" BOOLEAN NOT NULL DEFAULT false,
    "roastOptIn" BOOLEAN NOT NULL DEFAULT false,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "marketingOptInAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "privacyAcceptedAt" TIMESTAMP(3) NOT NULL,
    "privacyVersion" TEXT NOT NULL,
    "kycConsentAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stats" JSONB NOT NULL DEFAULT '[]',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isFounder" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentNumberLast4" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "KycProvider" NOT NULL DEFAULT 'MANUAL',
    "providerRef" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "rejectionReason" TEXT,
    "filesPurgedAt" TIMESTAMP(3),

    CONSTRAINT "KycSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycFile" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "kind" "KycFileKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycAccessLog" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fileId" TEXT,
    "actorId" TEXT,
    "action" "KycAccessAction" NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" "PlanId" NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthly" DECIMAL(12,2) NOT NULL,
    "priceYearly" DECIMAL(12,2) NOT NULL,
    "tagline" TEXT NOT NULL,
    "features" TEXT[],
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "PlanId" NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "amountEur" DECIMAL(12,2) NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "format" "CourseFormat" NOT NULL,
    "level" "Level" NOT NULL,
    "coachId" TEXT NOT NULL,
    "priceEur" DECIMAL(12,2) NOT NULL,
    "includedInPlans" "PlanId"[],
    "tags" TEXT[],
    "coverSeed" TEXT NOT NULL,
    "bestseller" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseChapter" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "CourseChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseLesson" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "preview" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "videoProvider" "VideoProvider" NOT NULL DEFAULT 'NONE',
    "videoId" TEXT,

    CONSTRAINT "CourseLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "amountEur" DECIMAL(12,2) NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupLesson" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "format" "LessonFormat" NOT NULL,
    "level" "Level" NOT NULL,
    "coachId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "minPlan" "PlanId" NOT NULL,
    "meetingUrl" TEXT,
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "format" "Format" NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "games" INTEGER NOT NULL,
    "itmCount" INTEGER,
    "hands" INTEGER,
    "avgBuyIn" DECIMAL(12,2) NOT NULL,
    "totalBuyIns" DECIMAL(12,2) NOT NULL,
    "totalCashes" DECIMAL(12,2) NOT NULL,
    "profit" DECIMAL(12,2) NOT NULL,
    "chipEvBb100" DOUBLE PRECISION,
    "bbWon" DOUBLE PRECISION,
    "tilt" INTEGER NOT NULL,
    "badBeats" INTEGER NOT NULL DEFAULT 0,
    "bubbles" INTEGER NOT NULL DEFAULT 0,
    "deepRun" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "staked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'ACTIVE',
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonStanding" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carryoverXp" INTEGER NOT NULL DEFAULT 0,
    "finalXp" INTEGER,
    "finalPosition" INTEGER,

    CONSTRAINT "SeasonStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "type" "XpEventType" NOT NULL,
    "xp" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" "BadgeRarity" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerCard" (
    "userId" TEXT NOT NULL,
    "mainFormat" "Format" NOT NULL,
    "pre" INTEGER NOT NULL,
    "post" INTEGER NOT NULL,
    "icm" INTEGER NOT NULL,
    "agg" INTEGER NOT NULL,
    "men" INTEGER NOT NULL,
    "vol" INTEGER NOT NULL,
    "volAuto" BOOLEAN NOT NULL DEFAULT true,
    "updatedByCoachId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerCard_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "DailySpot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "format" "Format" NOT NULL,
    "title" TEXT NOT NULL,
    "situation" TEXT NOT NULL,
    "heroCards" TEXT NOT NULL,
    "board" TEXT,
    "stacksBb" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOptionId" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySpotAnswer" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySpotAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoastSpot" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "format" "Format" NOT NULL,
    "heroCards" TEXT NOT NULL,
    "board" TEXT,
    "submittedByUserId" TEXT,
    "playedByMember" BOOLEAN NOT NULL DEFAULT false,
    "founderComment" TEXT,
    "hiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoastSpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoastVote" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "RoastVoteKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoastVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeepRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tournamentName" TEXT NOT NULL,
    "buyIn" DECIMAL(12,2) NOT NULL,
    "playersLeft" INTEGER NOT NULL,
    "totalPlayers" INTEGER NOT NULL,
    "stackBb" DOUBLE PRECISION NOT NULL,
    "status" "DeepRunStatus" NOT NULL DEFAULT 'LIVE',
    "finishPosition" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeepRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeepRunRail" (
    "id" TEXT NOT NULL,
    "deepRunId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeepRunRail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeepRunComment" (
    "id" TEXT NOT NULL,
    "deepRunId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeepRunComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamingEvent" (
    "id" TEXT NOT NULL,
    "kind" "GamingEventKind" NOT NULL,
    "game" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "maxParticipants" INTEGER,
    "prize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamingParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "won" BOOLEAN NOT NULL DEFAULT false,
    "bountyClaimed" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "format" "Format" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "handHistory" TEXT NOT NULL,
    "status" "HandReviewStatus" NOT NULL DEFAULT 'OPEN',
    "coachId" TEXT,
    "coachComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "HandReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StakingDeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "format" "Format" NOT NULL,
    "status" "StakingStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "schoolSharePct" DECIMAL(5,2) NOT NULL,
    "playerSharePct" DECIMAL(5,2) NOT NULL,
    "maxAbi" DECIMAL(12,2),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StakingDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "LedgerType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "sessionId" TEXT,
    "settledNet" DECIMAL(12,2),
    "playerShare" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "TxType" NOT NULL,
    "category" "TxCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT,
    "source" "TxSource" NOT NULL DEFAULT 'MANUAL',
    "externalRef" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_plan_idx" ON "User"("plan");

-- CreateIndex
CREATE INDEX "User_kycStatus_idx" ON "User"("kycStatus");

-- CreateIndex
CREATE INDEX "User_coachId_idx" ON "User"("coachId");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "KycSubmission_providerRef_key" ON "KycSubmission"("providerRef");

-- CreateIndex
CREATE INDEX "KycSubmission_userId_idx" ON "KycSubmission"("userId");

-- CreateIndex
CREATE INDEX "KycSubmission_status_submittedAt_idx" ON "KycSubmission"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "KycSubmission_reviewedAt_idx" ON "KycSubmission"("reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "KycFile_submissionId_kind_key" ON "KycFile"("submissionId", "kind");

-- CreateIndex
CREATE INDEX "KycAccessLog_submissionId_createdAt_idx" ON "KycAccessLog"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "KycAccessLog_actorId_idx" ON "KycAccessLog"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_canceledAt_idx" ON "Subscription"("canceledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_format_level_idx" ON "Course"("format", "level");

-- CreateIndex
CREATE INDEX "Course_published_idx" ON "Course"("published");

-- CreateIndex
CREATE UNIQUE INDEX "CourseChapter_courseId_position_key" ON "CourseChapter"("courseId", "position");

-- CreateIndex
CREATE INDEX "CourseLesson_courseId_idx" ON "CourseLesson"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseLesson_chapterId_position_key" ON "CourseLesson"("chapterId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_stripeSessionId_key" ON "Purchase"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Purchase_courseId_createdAt_idx" ON "Purchase"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "Purchase_createdAt_idx" ON "Purchase"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_userId_courseId_key" ON "Purchase"("userId", "courseId");

-- CreateIndex
CREATE INDEX "LessonProgress_userId_courseId_idx" ON "LessonProgress"("userId", "courseId");

-- CreateIndex
CREATE INDEX "LessonProgress_userId_completedAt_idx" ON "LessonProgress"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "GroupLesson_startsAt_idx" ON "GroupLesson"("startsAt");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_lessonId_userId_key" ON "Booking"("lessonId", "userId");

-- CreateIndex
CREATE INDEX "Session_userId_date_idx" ON "Session"("userId", "date");

-- CreateIndex
CREATE INDEX "Session_date_idx" ON "Session"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Season_number_key" ON "Season"("number");

-- CreateIndex
CREATE INDEX "Season_startsAt_endsAt_idx" ON "Season"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonStanding_seasonId_userId_key" ON "SeasonStanding"("seasonId", "userId");

-- CreateIndex
CREATE INDEX "XpEvent_seasonId_userId_idx" ON "XpEvent"("seasonId", "userId");

-- CreateIndex
CREATE INDEX "XpEvent_userId_type_createdAt_idx" ON "XpEvent"("userId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "XpEvent_userId_type_refId_key" ON "XpEvent"("userId", "type", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_key_key" ON "Badge"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "DailySpot_date_key" ON "DailySpot"("date");

-- CreateIndex
CREATE INDEX "DailySpotAnswer_userId_idx" ON "DailySpotAnswer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailySpotAnswer_spotId_userId_key" ON "DailySpotAnswer"("spotId", "userId");

-- CreateIndex
CREATE INDEX "RoastSpot_weekId_idx" ON "RoastSpot"("weekId");

-- CreateIndex
CREATE UNIQUE INDEX "RoastVote_spotId_userId_key" ON "RoastVote"("spotId", "userId");

-- CreateIndex
CREATE INDEX "DeepRun_status_updatedAt_idx" ON "DeepRun"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "DeepRun_userId_idx" ON "DeepRun"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeepRunRail_deepRunId_userId_key" ON "DeepRunRail"("deepRunId", "userId");

-- CreateIndex
CREATE INDEX "DeepRunComment_deepRunId_createdAt_idx" ON "DeepRunComment"("deepRunId", "createdAt");

-- CreateIndex
CREATE INDEX "GamingEvent_startsAt_idx" ON "GamingEvent"("startsAt");

-- CreateIndex
CREATE INDEX "GamingParticipant_userId_idx" ON "GamingParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GamingParticipant_eventId_userId_key" ON "GamingParticipant"("eventId", "userId");

-- CreateIndex
CREATE INDEX "HandReview_userId_createdAt_idx" ON "HandReview"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "HandReview_status_createdAt_idx" ON "HandReview"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StakingDeal_userId_status_idx" ON "StakingDeal"("userId", "status");

-- CreateIndex
CREATE INDEX "StakingDeal_status_idx" ON "StakingDeal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_sessionId_key" ON "LedgerEntry"("sessionId");

-- CreateIndex
CREATE INDEX "LedgerEntry_dealId_date_idx" ON "LedgerEntry"("dealId", "date");

-- CreateIndex
CREATE INDEX "LedgerEntry_type_date_idx" ON "LedgerEntry"("type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_externalRef_key" ON "Transaction"("externalRef");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_type_category_date_idx" ON "Transaction"("type", "category", "date");

-- CreateIndex
CREATE INDEX "CoachNote_userId_createdAt_idx" ON "CoachNote"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycSubmission" ADD CONSTRAINT "KycSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycSubmission" ADD CONSTRAINT "KycSubmission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycFile" ADD CONSTRAINT "KycFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "KycSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycAccessLog" ADD CONSTRAINT "KycAccessLog_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "KycSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseChapter" ADD CONSTRAINT "CourseChapter_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseLesson" ADD CONSTRAINT "CourseLesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseLesson" ADD CONSTRAINT "CourseLesson_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "CourseChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupLesson" ADD CONSTRAINT "GroupLesson_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "GroupLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonStanding" ADD CONSTRAINT "SeasonStanding_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonStanding" ADD CONSTRAINT "SeasonStanding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCard" ADD CONSTRAINT "PlayerCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCard" ADD CONSTRAINT "PlayerCard_updatedByCoachId_fkey" FOREIGN KEY ("updatedByCoachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySpot" ADD CONSTRAINT "DailySpot_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySpotAnswer" ADD CONSTRAINT "DailySpotAnswer_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "DailySpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySpotAnswer" ADD CONSTRAINT "DailySpotAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoastSpot" ADD CONSTRAINT "RoastSpot_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoastVote" ADD CONSTRAINT "RoastVote_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "RoastSpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoastVote" ADD CONSTRAINT "RoastVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeepRun" ADD CONSTRAINT "DeepRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeepRunRail" ADD CONSTRAINT "DeepRunRail_deepRunId_fkey" FOREIGN KEY ("deepRunId") REFERENCES "DeepRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeepRunRail" ADD CONSTRAINT "DeepRunRail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeepRunComment" ADD CONSTRAINT "DeepRunComment_deepRunId_fkey" FOREIGN KEY ("deepRunId") REFERENCES "DeepRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeepRunComment" ADD CONSTRAINT "DeepRunComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamingEvent" ADD CONSTRAINT "GamingEvent_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamingParticipant" ADD CONSTRAINT "GamingParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GamingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamingParticipant" ADD CONSTRAINT "GamingParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandReview" ADD CONSTRAINT "HandReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandReview" ADD CONSTRAINT "HandReview_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakingDeal" ADD CONSTRAINT "StakingDeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakingDeal" ADD CONSTRAINT "StakingDeal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "StakingDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachNote" ADD CONSTRAINT "CoachNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachNote" ADD CONSTRAINT "CoachNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

