CREATE TYPE "NotificationType" AS ENUM ('SCAN_MILESTONE', 'SYSTEM');

ALTER TABLE "Plan"
  ADD COLUMN "analyticsDays" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "customBranding" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "campaigns" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "scheduledLinks" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "passwordProtection" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reports" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bulkGeneration" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "smartRedirect" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "customDomains" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "integrations" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "apiAccess" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "webhooks" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "teamSeats" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL DEFAULT '#34d399',
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "qrCodeId" TEXT,
  "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomDomain" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "host" TEXT NOT NULL,
  "verificationToken" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomDomain_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiKey" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Webhook" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secretEncrypted" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Integration" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "gaMeasurementId" TEXT,
  "gaApiSecretEncrypted" TEXT,
  "metaPixelId" TEXT,
  "metaAccessTokenEncrypted" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "QRCode"
  ADD COLUMN "campaignId" TEXT,
  ADD COLUMN "customDomainId" TEXT,
  ADD COLUMN "utmSource" TEXT,
  ADD COLUMN "utmMedium" TEXT,
  ADD COLUMN "utmCampaign" TEXT,
  ADD COLUMN "activeFrom" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "fallbackUrl" TEXT,
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "passwordPrompt" TEXT,
  ADD COLUMN "iosUrl" TEXT,
  ADD COLUMN "androidUrl" TEXT,
  ADD COLUMN "desktopUrl" TEXT,
  ADD COLUMN "countryRules" JSONB,
  ADD COLUMN "notifyAtScans" INTEGER,
  ADD COLUMN "lastNotifiedAtCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "foregroundColor" TEXT NOT NULL DEFAULT '#07111f',
  ADD COLUMN "accentColor" TEXT NOT NULL DEFAULT '#34d399',
  ADD COLUMN "frameTitle" TEXT,
  ADD COLUMN "frameText" TEXT,
  ADD COLUMN "brandName" TEXT,
  ADD COLUMN "logoUrl" TEXT;

CREATE UNIQUE INDEX "CustomDomain_host_key" ON "CustomDomain"("host");
CREATE UNIQUE INDEX "ApiKey_prefix_key" ON "ApiKey"("prefix");
CREATE UNIQUE INDEX "Integration_userId_key" ON "Integration"("userId");
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");
CREATE INDEX "Campaign_userId_createdAt_idx" ON "Campaign"("userId", "createdAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_qrCodeId_idx" ON "Notification"("qrCodeId");
CREATE INDEX "CustomDomain_userId_idx" ON "CustomDomain"("userId");
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");
CREATE INDEX "ApiKey_userId_revokedAt_idx" ON "ApiKey"("userId", "revokedAt");
CREATE INDEX "Webhook_userId_idx" ON "Webhook"("userId");
CREATE INDEX "Webhook_userId_active_idx" ON "Webhook"("userId", "active");
CREATE INDEX "QRCode_campaignId_idx" ON "QRCode"("campaignId");
CREATE INDEX "QRCode_customDomainId_idx" ON "QRCode"("customDomainId");

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QRCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomDomain" ADD CONSTRAINT "CustomDomain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_customDomainId_fkey" FOREIGN KEY ("customDomainId") REFERENCES "CustomDomain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Plan" SET
  "qrLimit" = 3,
  "price" = 0.00,
  "analyticsDays" = 7,
  "customBranding" = false,
  "campaigns" = false,
  "scheduledLinks" = false,
  "passwordProtection" = false,
  "reports" = false,
  "bulkGeneration" = false,
  "smartRedirect" = false,
  "customDomains" = false,
  "integrations" = false,
  "apiAccess" = false,
  "webhooks" = false,
  "teamSeats" = 1
WHERE "name" = 'Gratuito';

UPDATE "Plan" SET
  "qrLimit" = 30,
  "price" = 49.90,
  "analyticsDays" = 90,
  "customBranding" = true,
  "campaigns" = true,
  "scheduledLinks" = true,
  "passwordProtection" = true,
  "reports" = true,
  "bulkGeneration" = false,
  "smartRedirect" = false,
  "customDomains" = false,
  "integrations" = false,
  "apiAccess" = false,
  "webhooks" = false,
  "teamSeats" = 1
WHERE "name" = 'Pro';

INSERT INTO "Plan" (
  "id", "name", "qrLimit", "dynamicLinks", "price", "analyticsDays", "customBranding", "campaigns",
  "scheduledLinks", "passwordProtection", "reports", "bulkGeneration", "smartRedirect", "customDomains",
  "integrations", "apiAccess", "webhooks", "teamSeats", "createdAt", "updatedAt"
) VALUES (
  'plan_business', 'Business', 200, true, 119.90, 365, true, true,
  true, true, true, true, true, true,
  true, true, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO UPDATE SET
  "qrLimit" = EXCLUDED."qrLimit",
  "price" = EXCLUDED."price",
  "analyticsDays" = EXCLUDED."analyticsDays",
  "customBranding" = EXCLUDED."customBranding",
  "campaigns" = EXCLUDED."campaigns",
  "scheduledLinks" = EXCLUDED."scheduledLinks",
  "passwordProtection" = EXCLUDED."passwordProtection",
  "reports" = EXCLUDED."reports",
  "bulkGeneration" = EXCLUDED."bulkGeneration",
  "smartRedirect" = EXCLUDED."smartRedirect",
  "customDomains" = EXCLUDED."customDomains",
  "integrations" = EXCLUDED."integrations",
  "apiAccess" = EXCLUDED."apiAccess",
  "webhooks" = EXCLUDED."webhooks",
  "teamSeats" = EXCLUDED."teamSeats",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "Plan" SET
  "qrLimit" = -1,
  "price" = 0.00,
  "analyticsDays" = -1,
  "customBranding" = true,
  "campaigns" = true,
  "scheduledLinks" = true,
  "passwordProtection" = true,
  "reports" = true,
  "bulkGeneration" = true,
  "smartRedirect" = true,
  "customDomains" = true,
  "integrations" = true,
  "apiAccess" = true,
  "webhooks" = true,
  "teamSeats" = 10
WHERE "name" = 'Enterprise';
