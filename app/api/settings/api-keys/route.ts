import { NextResponse } from "next/server";
import { createApiToken } from "@/lib/api-auth";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";
import { apiKeySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const [items, subscription] = await Promise.all([
    prisma.apiKey.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    }),
    getActiveSubscription(auth.userId),
  ]);
  return NextResponse.json({ success: true, items, enabled: subscription.plan.apiAccess });
}

export async function POST(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const subscription = await getActiveSubscription(auth.userId);
  if (!subscription.plan.apiAccess) {
    return NextResponse.json({ success: false, message: "API está disponível no plano Business." }, { status: 403 });
  }

  const parsed = apiKeySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "Nome inválido." }, { status: 400 });
  const generated = createApiToken();
  const item = await prisma.apiKey.create({
    data: { userId: auth.userId, name: parsed.data.name, prefix: generated.prefix, secretHash: generated.hash },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });
  return NextResponse.json({ success: true, item, token: generated.token }, { status: 201 });
}
