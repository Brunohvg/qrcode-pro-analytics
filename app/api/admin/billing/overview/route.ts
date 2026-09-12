import { NextResponse } from "next/server";
import { requireDeveloperAdmin } from "@/lib/admin";
import { getBillingSettings } from "@/lib/billing";
import { mercadoPagoConfigured, mercadoPagoWebhookConfigured } from "@/lib/mercado-pago";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireDeveloperAdmin();
  if (!admin) return NextResponse.json({ success: false }, { status: 403 });

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { plan: true },
      },
    },
  });
  const userIds = users.map((user) => user.id);

  const [settings, qrs, payments, recentPayments] = await Promise.all([
    getBillingSettings(),
    prisma.qRCode.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        scanCount: true,
        _count: { select: { scanMetrics: { where: { scannedAt: { gte: since30 } } } } },
        scanMetrics: { orderBy: { scannedAt: "desc" }, take: 1, select: { scannedAt: true } },
      },
    }),
    prisma.payment.findMany({
      where: { status: "APPROVED", userId: { in: userIds } },
      select: { userId: true, amount: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    prisma.payment.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { email: true } },
        plan: { select: { name: true } },
        subscription: { select: { id: true, status: true } },
      },
    }),
  ]);

  const usage = new Map<string, { qrCount: number; lifetimeScans: number; scans30: number; lastScan: Date | null }>();
  for (const qr of qrs) {
    const current = usage.get(qr.userId) ?? { qrCount: 0, lifetimeScans: 0, scans30: 0, lastScan: null };
    current.qrCount += 1;
    current.lifetimeScans += qr.scanCount;
    current.scans30 += qr._count.scanMetrics;
    const last = qr.scanMetrics[0]?.scannedAt ?? null;
    if (last && (!current.lastScan || last > current.lastScan)) current.lastScan = last;
    usage.set(qr.userId, current);
  }

  const revenue = new Map<string, number>();
  for (const payment of payments) {
    revenue.set(payment.userId, (revenue.get(payment.userId) ?? 0) + Number(payment.amount));
  }

  const now = new Date();
  const customerRows = users.map((user) => {
    const subscription = user.subscriptions.find((item) =>
      item.status === "ACTIVE" ||
      (item.status === "PAST_DUE" && item.graceUntil && item.graceUntil > now),
    ) ?? user.subscriptions[0] ?? null;
    const stats = usage.get(user.id) ?? { qrCount: 0, lifetimeScans: 0, scans30: 0, lastScan: null };
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      plan: subscription?.plan.name ?? "Sem plano",
      planPrice: subscription?.plan.price.toString() ?? "0",
      subscriptionStatus: subscription?.status ?? null,
      provider: subscription?.provider ?? null,
      activeUntil: subscription?.activeUntil ?? null,
      graceUntil: subscription?.graceUntil ?? null,
      qrCount: stats.qrCount,
      lifetimeScans: stats.lifetimeScans,
      scans30: stats.scans30,
      lastScan: stats.lastScan,
      revenue: (revenue.get(user.id) ?? 0).toFixed(2),
    };
  });

  const activePaid = customerRows.filter((item) => ["Pro", "Business", "Enterprise"].includes(item.plan) && item.subscriptionStatus === "ACTIVE" && item.provider !== "ADMIN");
  const mrr = activePaid.reduce((sum, item) => sum + Number(item.planPrice), 0);

  return NextResponse.json({
    success: true,
    integration: {
      mercadoPagoAccessToken: mercadoPagoConfigured(),
      mercadoPagoWebhookSecret: mercadoPagoWebhookConfigured(),
    },
    settings,
    summary: {
      customers: users.length,
      activePaid: activePaid.length,
      pastDue: customerRows.filter((item) => item.subscriptionStatus === "PAST_DUE").length,
      pendingManualPix: recentPayments.filter((payment) => payment.provider === "MANUAL_PIX" && ["PENDING", "IN_REVIEW"].includes(payment.status)).length,
      mrr: mrr.toFixed(2),
      scans30: customerRows.reduce((sum, item) => sum + item.scans30, 0),
    },
    customers: customerRows,
    payments: recentPayments.map((payment) => ({
      id: payment.id,
      email: payment.user.email,
      planName: payment.plan.name,
      provider: payment.provider,
      status: payment.status,
      amount: payment.amount.toString(),
      externalReference: payment.externalReference,
      method: payment.method,
      paidAt: payment.paidAt,
      dueAt: payment.dueAt,
      createdAt: payment.createdAt,
      reviewNote: payment.reviewNote,
      subscriptionId: payment.subscription?.id ?? null,
      subscriptionStatus: payment.subscription?.status ?? null,
    })),
  });
}
