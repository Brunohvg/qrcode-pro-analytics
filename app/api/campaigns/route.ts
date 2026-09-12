import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";
import { campaignSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });

  const [items, subscription] = await Promise.all([
    prisma.campaign.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { qrCodes: true } } },
    }),
    getActiveSubscription(auth.userId),
  ]);

  return NextResponse.json({ success: true, items, enabled: subscription.plan.campaigns });
}

export async function POST(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });

  const subscription = await getActiveSubscription(auth.userId);
  if (!subscription.plan.campaigns) {
    return NextResponse.json({ success: false, message: "Campanhas estão disponíveis a partir do plano Pro." }, { status: 403 });
  }

  const parsed = campaignSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "Dados da campanha inválidos." }, { status: 400 });

  const item = await prisma.campaign.create({
    data: {
      userId: auth.userId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      color: parsed.data.color,
    },
    include: { _count: { select: { qrCodes: true } } },
  });

  return NextResponse.json({ success: true, item }, { status: 201 });
}
