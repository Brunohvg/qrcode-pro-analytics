import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";
import { createQrSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });

  const [items, subscription] = await Promise.all([
    prisma.qRCode.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, originalUrl: true, slug: true, scanCount: true, createdAt: true, updatedAt: true },
    }),
    getActiveSubscription(auth.userId),
  ]);

  return NextResponse.json({
    success: true,
    items,
    plan: {
      name: subscription.plan.name,
      qrLimit: subscription.plan.qrLimit,
      dynamicLinks: subscription.plan.dynamicLinks,
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
      },
      select: { id: true, name: true, originalUrl: true, slug: true, scanCount: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    console.error("CREATE_QR_ERROR", error);
    return NextResponse.json({ success: false, message: "Não foi possível criar o QR Code." }, { status: 500 });
  }
}
