import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { percent } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });

  const [totalScans, qrCount, grouped] = await Promise.all([
    prisma.scanMetric.count({ where: { qrCode: { userId: auth.userId } } }),
    prisma.qRCode.count({ where: { userId: auth.userId } }),
    prisma.scanMetric.groupBy({
      by: ["device"],
      where: { qrCode: { userId: auth.userId } },
      _count: { _all: true },
    }),
  ]);

  const counts = { IOS: 0, ANDROID: 0, DESKTOP: 0 };
  for (const row of grouped) counts[row.device] = row._count._all;

  return NextResponse.json({
    success: true,
    metrics: {
      totalScans,
      qrCount,
      ios: { count: counts.IOS, percent: percent(counts.IOS, totalScans) },
      android: { count: counts.ANDROID, percent: percent(counts.ANDROID, totalScans) },
      desktop: { count: counts.DESKTOP, percent: percent(counts.DESKTOP, totalScans) },
    },
  });
}
