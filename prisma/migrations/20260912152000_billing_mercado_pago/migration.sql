ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PENDING';

CREATE TYPE "BillingProvider" AS ENUM ('MERCADO_PAGO', 'MANUAL_PIX', 'ADMIN');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'REFUNDED', 'IN_REVIEW');
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY');

ALTER TABLE "Subscription"
  ADD COLUMN "provider" "BillingProvider",
  ADD COLUMN "providerSubscriptionId" TEXT,
  ADD COLUMN "externalReference" TEXT,
  ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN "checkoutUrl" TEXT,
  ADD COLUMN "currentPeriodStart" TIMESTAMP(3),
  ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
  ADD COLUMN "graceUntil" TIMESTAMP(3),
  ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");
CREATE UNIQUE INDEX "Subscription_externalReference_key" ON "Subscription"("externalReference");
CREATE INDEX "Subscription_provider_status_idx" ON "Subscription"("provider", "status");

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "provider" "BillingProvider" NOT NULL,
  "providerPaymentId" TEXT,
  "externalReference" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "providerStatus" TEXT,
  "method" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "description" TEXT,
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE INDEX "Payment_externalReference_idx" ON "Payment"("externalReference");
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
CREATE INDEX "Payment_provider_status_idx" ON "Payment"("provider", "status");

CREATE TABLE "BillingSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "mercadoPagoEnabled" BOOLEAN NOT NULL DEFAULT true,
  "manualPixEnabled" BOOLEAN NOT NULL DEFAULT false,
  "pixKey" TEXT,
  "pixKeyType" TEXT,
  "pixRecipientName" TEXT,
  "pixCity" TEXT,
  "manualPixInstructions" TEXT,
  "gracePeriodDays" INTEGER NOT NULL DEFAULT 3,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "BillingSettings" ("id", "createdAt", "updatedAt")
VALUES ('default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "BillingWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "resourceId" TEXT,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingWebhookEvent_providerEventId_key" ON "BillingWebhookEvent"("providerEventId");
CREATE INDEX "BillingWebhookEvent_provider_createdAt_idx" ON "BillingWebhookEvent"("provider", "createdAt");
CREATE INDEX "BillingWebhookEvent_processedAt_idx" ON "BillingWebhookEvent"("processedAt");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
