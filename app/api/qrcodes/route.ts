import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";
import { createQrSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const qrSelect = {
  id: true,
  name: true,
  originalUrl: true,
  slug: true,
  scanCount: true,
  campaignId: true,
  createdAt: true,
  updatedAt: true,
  campaign: { select: { id: true, name: true, color: true } },
} as const;

export async function GET() {
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });

  const [items, subscription] = await Promise.all([
    prisma.qRCode.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      select: qrSelect,
    }),
    getActiveSubscription(auth.userId),
  ]);

  const plan = subscription.plan;
  return NextResponse.json({
    success: true,
    items,
    plan: {
      name: plan.name,
      qrLimit: plan.qrLimit,
      dynamicLinks: plan.dynamicLinks,
      analyticsDays: plan.analyticsDays,
      customBranding: plan.customBranding,
      campaigns: plan.campaigns,
      scheduledLinks: plan.scheduledLinks,
      passwordProtection: plan.passwordProtection,
      reports: plan.reports,
      bulkGeneration: plan.bulkGeneration,
      smartRedirect: plan.smartRedirect,
      customDomains: plan.customDomains,
      integrations: plan.integrations,
      apiAccess: plan.apiAccess,
      webhooks: plan.webhooks,
      teamSeats: plan.teamSeats,
    },
  });
}

export async function POST(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });

  try {
    const parsed = createQrSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Revise os dados do QR Code.", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const subscription = await getActiveSubscription(auth.userId);
    const currentCount = await prisma.qRCode.count({ where: { userId: auth.userId } });
    if (subscription.plan.qrLimit >= 0 && currentCount >= subscription.plan.qrLimit) {
      return NextResponse.json(
        { success: false, message: `Seu plano permite até ${subscription.plan.qrLimit} QR Codes. Faça upgrade para continuar.` },
        { status: 403 },
      );
    }

    if (parsed.data.campaignId) {
      if (!subscription.plan.campaigns) {
        return NextResponse.json({ success: false, message: "Campanhas estão disponíveis a partir do plano Pro." }, { status: 403 });
      }
      const campaign = await prisma.campaign.findFirst({
        where: { id: parsed.data.campaignId, userId: auth.userId },
        select: { id: true },
      });
      if (!campaign) return NextResponse.json({ success: false, message: "Campanha inválida." }, { status: 400 });
    }

    let slug = nanoid(10);
    for (let attempts = 0; attempts < 4; attempts += 1) {
      const exists = await prisma.qRCode.findUnique({ where: { slug }, select: { id: true } });
      if (!exists) break;
      slug = nanoid(10);
    }

    const item = await prisma.qRCode.create({
      data: {
        name: parsed.data.name,
        originalUrl: parsed.data.originalUrl,
        slug,
        userId: auth.userId,
        campaignId: parsed.data.campaignId ?? null,
      },
      select: qrSelect,
    });
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    console.error("CREATE_QR_ERROR", error);
    return NextResponse.json({ success: false, message: "Não foi possível criar o QR Code." }, { status: 500 });
  }
}
