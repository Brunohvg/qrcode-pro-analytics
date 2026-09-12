import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request) {
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const subscription = await getActiveSubscription(auth.userId);
  if (!subscription.plan.reports) {
    return NextResponse.json({ success: false, message: "Relatórios estão disponíveis a partir do plano Pro." }, { status: 403 });
  }

  const cutoff = subscription.plan.analyticsDays > 0
    ? new Date(Date.now() - subscription.plan.analyticsDays * 24 * 60 * 60 * 1000)
    : undefined;

  const metrics = await prisma.scanMetric.findMany({
    where: {
      qrCode: { userId: auth.userId },
      ...(cutoff ? { scannedAt: { gte: cutoff } } : {}),
    },
    orderBy: { scannedAt: "desc" },
    take: 50_000,
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
          slug: true,
          campaign: { select: { name: true } },
        },
      },
    },
  });

  const url = new URL(request.url);
  if (url.searchParams.get("format") === "csv") {
    const header = ["data", "qr_code", "slug", "campanha", "dispositivo", "navegador", "pais"];
    const rows = metrics.map((item) => [
      item.scannedAt.toISOString(),
      item.qrCode.name,
      item.qrCode.slug,
      item.qrCode.campaign?.name ?? "",
      item.device,
      item.browser,
      item.country,
    ]);
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="qr-metrics-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const devices = { IOS: 0, ANDROID: 0, DESKTOP: 0 };
  const countries = new Map<string, number>();
  const browsers = new Map<string, number>();
  const qrCodes = new Map<string, { id: string; name: string; scans: number }>();

  for (const metric of metrics) {
    devices[metric.device] += 1;
    countries.set(metric.country, (countries.get(metric.country) ?? 0) + 1);
    browsers.set(metric.browser, (browsers.get(metric.browser) ?? 0) + 1);
    const current = qrCodes.get(metric.qrCode.id);
    qrCodes.set(metric.qrCode.id, { id: metric.qrCode.id, name: metric.qrCode.name, scans: (current?.scans ?? 0) + 1 });
  }

  const top = (map: Map<string, number>) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, scans]) => ({ name, scans }));

  return NextResponse.json({
    success: true,
    report: {
      totalScans: metrics.length,
      analyticsDays: subscription.plan.analyticsDays,
      devices,
      countries: top(countries),
      browsers: top(browsers),
      qrCodes: [...qrCodes.values()].sort((a, b) => b.scans - a.scans).slice(0, 10),
      generatedAt: new Date().toISOString(),
    },
  });
}
