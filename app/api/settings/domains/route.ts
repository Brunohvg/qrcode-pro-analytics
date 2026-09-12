import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getPublicOrigin } from "@/lib/public-url";
import { rejectCrossSiteMutation } from "@/lib/security";
import { customDomainSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const [items, subscription] = await Promise.all([
    prisma.customDomain.findMany({ where: { userId: auth.userId }, orderBy: { createdAt: "desc" } }),
    getActiveSubscription(auth.userId),
  ]);
  return NextResponse.json({
    success: true,
    items,
    enabled: subscription.plan.customDomains,
    cnameTarget: new URL(getPublicOrigin(request)).host,
  });
}

export async function POST(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const subscription = await getActiveSubscription(auth.userId);
  if (!subscription.plan.customDomains) {
    return NextResponse.json({ success: false, message: "Domínio próprio está disponível no plano Business." }, { status: 403 });
  }

  const parsed = customDomainSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "Domínio inválido." }, { status: 400 });

  try {
    const item = await prisma.customDomain.create({
      data: { userId: auth.userId, host: parsed.data.host, verificationToken: nanoid(32) },
    });
    return NextResponse.json({
      success: true,
      item,
      txtName: `_qrmetrics.${item.host}`,
      txtValue: item.verificationToken,
      cnameTarget: new URL(getPublicOrigin(request)).host,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, message: "Este domínio já está cadastrado." }, { status: 409 });
  }
}
