import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";
import { encryptSecret } from "@/lib/secrets";
import { webhookSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const [items, subscription] = await Promise.all([
    prisma.webhook.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, url: true, active: true, createdAt: true, updatedAt: true },
    }),
    getActiveSubscription(auth.userId),
  ]);
  return NextResponse.json({ success: true, items, enabled: subscription.plan.webhooks });
}

export async function POST(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const subscription = await getActiveSubscription(auth.userId);
  if (!subscription.plan.webhooks) {
    return NextResponse.json({ success: false, message: "Webhooks estão disponíveis no plano Business." }, { status: 403 });
  }
  const parsed = webhookSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "Webhook inválido." }, { status: 400 });

  const secret = randomBytes(32).toString("base64url");
  const item = await prisma.webhook.create({
    data: {
      userId: auth.userId,
      name: parsed.data.name,
      url: parsed.data.url,
      active: parsed.data.active ?? true,
      secretEncrypted: encryptSecret(secret),
    },
    select: { id: true, name: true, url: true, active: true, createdAt: true },
  });
  return NextResponse.json({ success: true, item, secret }, { status: 201 });
}
