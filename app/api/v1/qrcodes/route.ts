import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { createQrSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const items = await prisma.qRCode.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, originalUrl: true, slug: true, scanCount: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ data: items });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = createQrSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten().fieldErrors }, { status: 400 });

  const subscription = await getActiveSubscription(auth.userId);
  const count = await prisma.qRCode.count({ where: { userId: auth.userId } });
  if (subscription.plan.qrLimit >= 0 && count >= subscription.plan.qrLimit) {
    return NextResponse.json({ error: "plan_limit_reached" }, { status: 403 });
  }

  if (parsed.data.campaignId) {
    const campaign = await prisma.campaign.findFirst({ where: { id: parsed.data.campaignId, userId: auth.userId }, select: { id: true } });
    if (!campaign) return NextResponse.json({ error: "invalid_campaign" }, { status: 400 });
  }

  const item = await prisma.qRCode.create({
    data: {
      userId: auth.userId,
      name: parsed.data.name,
      originalUrl: parsed.data.originalUrl,
      campaignId: parsed.data.campaignId ?? null,
      slug: nanoid(10),
    },
    select: { id: true, name: true, originalUrl: true, slug: true, scanCount: true, createdAt: true },
  });

  return NextResponse.json({ data: item }, { status: 201 });
}
