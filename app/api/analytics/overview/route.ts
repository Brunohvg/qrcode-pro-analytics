import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIODS = [7, 30, 90, 365] as const;

function parseRequestedDays(value: string | null, planLimit: number): number | null {
  if (value === "all" && planLimit === 0) return null;
  const parsed = Number(value);
  const fallback = planLimit === 0 ? 30 : Math.min(30, planLimit);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  if (planLimit > 0) return Math.min(Math.round(parsed), planLimit);
  return Math.round(parsed);
}

function sortedMap(map: Map<string, number>, limit?: number) {
  const items = [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  return typeof limit === "number" ? items.slice(0, limit) : items;
}

export async function GET(request: Request) {
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });

  const subscription = await getActiveSubscription(auth.userId);
  const planLimit = subscription.plan.analyticsDays;
  const url = new URL(request.url);
  const days = parseRequestedDays(url.searchParams.get("days"), planLimit);
  const now = new Date();
  const since = days ? new Date(now.getTime() - days * DAY_MS) : undefined;
  const previousStart = days && since ? new Date(since.getTime() - days * DAY_MS) : undefined;

  const [qrs, metrics, previousPeriodScans, recent] = await Promise.all([
    prisma.qRCode.findMany({
      where: { userId: auth.userId },
      select: {
        id: true,
        name: true,
        slug: true,
        scanCount: true,
        createdAt: true,
        campaign: { select: { id: true, name: true, color: true } },
      },
      orderBy: { scanCount: "desc" },
    }),
    prisma.scanMetric.findMany({
      where: {
        qrCode: { userId: auth.userId },
        ...(since ? { scannedAt: { gte: since } } : {}),
      },
      select: {
        device: true,
        country: true,
        browser: true,
        scannedAt: true,
        qrCode: {
          select: {
            id: true,
            name: true,
            campaign: { select: { id: true, name: true, color: true } },
          },
        },
      },
    }),
    previousStart && since
      ? prisma.scanMetric.count({
          where: {
            qrCode: { userId: auth.userId },
            scannedAt: { gte: previousStart, lt: since },
          },
        })
      : Promise.resolve(0),
    prisma.scanMetric.findMany({
      where: {
        qrCode: { userId: auth.userId },
        ...(since ? { scannedAt: { gte: since } } : {}),
      },
      orderBy: { scannedAt: "desc" },
      take: 40,
      select: {
        id: true,
        device: true,
        country: true,
        browser: true,
        scannedAt: true,
        qrCode: {
          select: {
            id: true,
            name: true,
            campaign: { select: { name: true, color: true } },
          },
        },
      },
    }),
  ]);

  const byDay = new Map<string, number>();
  const byDevice = new Map<string, number>();
  const byBrowser = new Map<string, number>();
  const byCountry = new Map<string, number>();
  const byQr = new Map<string, number>();
  const byCampaign = new Map<string, number>();
  const activeQrIds = new Set<string>();

  for (const metric of metrics) {
    const day = metric.scannedAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    byDevice.set(metric.device, (byDevice.get(metric.device) ?? 0) + 1);
    byBrowser.set(metric.browser, (byBrowser.get(metric.browser) ?? 0) + 1);
    byCountry.set(metric.country, (byCountry.get(metric.country) ?? 0) + 1);
    byQr.set(metric.qrCode.id, (byQr.get(metric.qrCode.id) ?? 0) + 1);
    const campaignName = metric.qrCode.campaign?.name ?? "Sem campanha";
    byCampaign.set(campaignName, (byCampaign.get(campaignName) ?? 0) + 1);
    activeQrIds.add(metric.qrCode.id);
  }

  if (days && since) {
    for (let index = days - 1; index >= 0; index -= 1) {
      const key = new Date(now.getTime() - index * DAY_MS).toISOString().slice(0, 10);
      if (!byDay.has(key)) byDay.set(key, 0);
    }
  }

  const lifetimeScans = qrs.reduce((sum, qr) => sum + qr.scanCount, 0);
  const periodScans = metrics.length;
  const growthPercent = previousPeriodScans === 0
    ? null
    : Math.round(((periodScans - previousPeriodScans) / previousPeriodScans) * 1000) / 10;

  const topQrs = qrs
    .map((qr) => ({
      id: qr.id,
      name: qr.name,
      slug: qr.slug,
      campaign: qr.campaign,
      periodScans: byQr.get(qr.id) ?? 0,
      lifetimeScans: qr.scanCount,
      createdAt: qr.createdAt,
    }))
    .sort((a, b) => b.periodScans - a.periodScans || b.lifetimeScans - a.lifetimeScans)
    .slice(0, 20);

  const availablePeriods = PERIODS.filter((period) => planLimit === 0 || period <= planLimit);

  return NextResponse.json({
    success: true,
    plan: {
      name: subscription.plan.name,
      analyticsDays: planLimit,
      availablePeriods,
      canViewAll: planLimit === 0,
    },
    period: {
      days,
      label: days ? `${days} dias` : "Todo o histórico",
      from: since?.toISOString() ?? null,
      to: now.toISOString(),
    },
    summary: {
      periodScans,
      previousPeriodScans,
      growthPercent,
      lifetimeScans,
      qrCount: qrs.length,
      activeQrCount: activeQrIds.size,
      averageScansPerQr: qrs.length > 0 ? Math.round((periodScans / qrs.length) * 10) / 10 : 0,
    },
    byDay: [...byDay.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    byDevice: sortedMap(byDevice),
    byBrowser: sortedMap(byBrowser, 10),
    byCountry: sortedMap(byCountry, 15),
    byCampaign: sortedMap(byCampaign, 15),
    topQrs,
    recent,
  });
}
