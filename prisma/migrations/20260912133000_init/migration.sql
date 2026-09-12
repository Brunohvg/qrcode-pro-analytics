CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED', 'PAST_DUE');
CREATE TYPE "DeviceType" AS ENUM ('IOS', 'ANDROID', 'DESKTOP');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "qrLimit" INTEGER NOT NULL,
  "dynamicLinks" BOOLEAN NOT NULL DEFAULT false,
  "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "activeUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QRCode" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "originalUrl" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "scanCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QRCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScanMetric" (
  "id" TEXT NOT NULL,
  "qrCodeId" TEXT NOT NULL,
  "device" "DeviceType" NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'Unknown',
  "browser" TEXT NOT NULL DEFAULT 'Unknown',
  "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScanMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");
CREATE UNIQUE INDEX "QRCode_slug_key" ON "QRCode"("slug");
CREATE INDEX "QRCode_userId_idx" ON "QRCode"("userId");
CREATE INDEX "QRCode_userId_createdAt_idx" ON "QRCode"("userId", "createdAt");
CREATE INDEX "QRCode_scanCount_idx" ON "QRCode"("scanCount");
CREATE INDEX "ScanMetric_qrCodeId_idx" ON "ScanMetric"("qrCodeId");
CREATE INDEX "ScanMetric_scannedAt_idx" ON "ScanMetric"("scannedAt");
CREATE INDEX "ScanMetric_device_idx" ON "ScanMetric"("device");
CREATE INDEX "ScanMetric_country_idx" ON "ScanMetric"("country");
CREATE INDEX "ScanMetric_qrCodeId_scannedAt_idx" ON "ScanMetric"("qrCodeId", "scannedAt");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScanMetric" ADD CONSTRAINT "ScanMetric_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QRCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Plan" ("id", "name", "qrLimit", "dynamicLinks", "price", "createdAt", "updatedAt") VALUES
('plan_free', 'Gratuito', 3, true, 0.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('plan_pro', 'Pro', -1, true, 29.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('plan_enterprise', 'Enterprise', -1, true, 99.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
