import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const subscription = await getActiveSubscription(auth.userId);

  const { id } = await params;
  const qr = await prisma.qRCode.findFirst({
    where: { id, userId: auth.userId },
    select: { id: true, name: true, slug: true, originalUrl: true, scanCount: true, createdAt: true },
  });
  if (!qr) return NextResponse.json({ success: false, message: "QR Code não encontrado." }, { status: 404 });

  const analyticsDays = subscription.plan.analyticsDays;
  const since = analyticsDays > 0 ? new Date(Date.now() - analyticsDays * 24 * 60 * 60 * 1000) : undefined;
  const metrics = await prisma.scanMetric.findMany({
    where: { qrCodeId: qr.id, ...(since ? { scannedAt: { gte: since } } : {}) },
    orderBy: { scannedAt: "desc" },
    select: { id: true, device: true, country: true, browser: true, scannedAt: true },
  });

  const byDay = new Map<string, number>();
  const byDevice = new Map<string, number>();
  const byBrowser = new Map<string, number>();
  const byCountry = new Map<string, number>();
  for (const metric of metrics) {
    const day = metric.scannedAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    byDevice.set(metric.device, (byDevice.get(metric.device) ?? 0) + 1);
    byBrowser.set(metric.browser, (byBrowser.get(metric.browser) ?? 0) + 1);
    byCountry.set(metric.country, (byCountry.get(metric.country) ?? 0) + 1);
  }

  const last24 = metrics.filter((metric) => metric.scannedAt.getTime() >= Date.now() - 24 * 60 * 60 * 1000).length;
  const sortedMap = (map: Map<string, number>) => [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    success: true,
    qr,
    plan: { name: subscription.plan.name, analyticsDays },
    summary: { last24, period: metrics.length, lifetime: qr.scanCount },
    byDay: sortedMap(byDay).sort((a, b) => a.label.localeCompare(b.label)),
    byDevice: sortedMap(byDevice),
    byBrowser: sortedMap(byBrowser),
    byCountry: sortedMap(byCountry).slice(0, 20),
    recent: metrics.slice(0, 100),
  });
}
