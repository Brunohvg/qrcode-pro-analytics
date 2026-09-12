import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";

export async function getBillingSettings() {
  return prisma.billingSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

export async function createPendingSubscription(input: {
  userId: string;
  planId: string;
  provider: "MERCADO_PAGO" | "MANUAL_PIX" | "ADMIN";
  externalReference?: string;
}) {
  const externalReference = input.externalReference ?? `sub_${nanoid(22)}`;
  return prisma.subscription.create({
    data: {
      userId: input.userId,
      planId: input.planId,
      status: "PENDING",
      provider: input.provider,
      externalReference,
    },
    include: { plan: true },
  });
}

export async function activateSubscriptionById(
  subscriptionId: string,
  options?: {
    activeUntil?: Date | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
  },
) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    if (!target) throw new Error("Assinatura local não encontrada.");

    await tx.subscription.updateMany({
      where: {
        userId: target.userId,
        id: { not: target.id },
        status: { in: ["ACTIVE", "PAST_DUE"] },
      },
      data: { status: "CANCELED", cancelAtPeriodEnd: false },
    });

    const now = new Date();
    const defaultEnd = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
    const hasActiveUntil = Boolean(options && Object.prototype.hasOwnProperty.call(options, "activeUntil"));
    const hasPeriodEnd = Boolean(options && Object.prototype.hasOwnProperty.call(options, "currentPeriodEnd"));
    const activeUntil = hasActiveUntil ? options?.activeUntil ?? null : defaultEnd;
    const periodEnd = hasPeriodEnd ? options?.currentPeriodEnd ?? null : activeUntil;

    return tx.subscription.update({
      where: { id: target.id },
      data: {
        status: "ACTIVE",
        activeUntil,
        currentPeriodStart: options?.currentPeriodStart ?? now,
        currentPeriodEnd: periodEnd,
        graceUntil: null,
        cancelAtPeriodEnd: false,
      },
      include: { plan: true },
    });
  });
}

export async function markSubscriptionPastDue(subscriptionId: string) {
  const [settings, subscription] = await Promise.all([
    getBillingSettings(),
    prisma.subscription.findUnique({ where: { id: subscriptionId } }),
  ]);
  if (!subscription) throw new Error("Assinatura não encontrada.");

  const now = new Date();
  const base =
    subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
      ? subscription.currentPeriodEnd
      : now;
  const graceUntil = new Date(base.getTime() + Math.max(0, settings.gracePeriodDays) * 24 * 60 * 60 * 1000);

  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "PAST_DUE", graceUntil },
  });
}

export function mapPaymentStatus(status: string | null | undefined):
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELED"
  | "REFUNDED"
  | "IN_REVIEW" {
  switch ((status ?? "").toLowerCase()) {
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    case "cancelled":
    case "canceled":
      return "CANCELED";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    case "in_process":
    case "in_mediation":
    case "authorized":
      return "IN_REVIEW";
    default:
      return "PENDING";
  }
}
