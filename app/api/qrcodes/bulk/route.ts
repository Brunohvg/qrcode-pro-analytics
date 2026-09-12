import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";
import { bulkQrSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const subscription = await getActiveSubscription(auth.userId);
  if (!subscription.plan.bulkGeneration) {
    return NextResponse.json({ success: false, message: "Geração em lote está disponível no plano Business." }, { status: 403 });
  }

  const parsed = bulkQrSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Lista inválida. Envie até 200 itens com nome e URL." }, { status: 400 });
  }

  const currentCount = await prisma.qRCode.count({ where: { userId: auth.userId } });
  if (subscription.plan.qrLimit >= 0 && currentCount + parsed.data.items.length > subscription.plan.qrLimit) {
    return NextResponse.json({ success: false, message: `O lote ultrapassa o limite de ${subscription.plan.qrLimit} QR Codes do seu plano.` }, { status: 403 });
  }

  const created = await prisma.$transaction(
    parsed.data.items.map((item) => prisma.qRCode.create({
      data: { userId: auth.userId, name: item.name, originalUrl: item.originalUrl, slug: nanoid(10) },
      select: { id: true, name: true, originalUrl: true, slug: true },
    })),
  );

  return NextResponse.json({ success: true, count: created.length, items: created }, { status: 201 });
}
