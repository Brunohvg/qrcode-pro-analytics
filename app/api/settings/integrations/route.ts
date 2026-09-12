import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";
import { encryptSecret } from "@/lib/secrets";
import { integrationSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const [item, subscription] = await Promise.all([
    prisma.integration.findUnique({ where: { userId: auth.userId } }),
    getActiveSubscription(auth.userId),
  ]);
  return NextResponse.json({
    success: true,
    enabled: subscription.plan.integrations,
    integration: item
      ? {
          gaMeasurementId: item.gaMeasurementId,
          gaApiSecretConfigured: Boolean(item.gaApiSecretEncrypted),
          metaPixelId: item.metaPixelId,
          metaAccessTokenConfigured: Boolean(item.metaAccessTokenEncrypted),
        }
      : null,
  });
}

export async function PUT(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const subscription = await getActiveSubscription(auth.userId);
  if (!subscription.plan.integrations) {
    return NextResponse.json({ success: false, message: "GA4 e Meta Pixel estão disponíveis no plano Business." }, { status: 403 });
  }

  const parsed = integrationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "Configuração inválida." }, { status: 400 });
  const input = parsed.data;
  const existing = await prisma.integration.findUnique({ where: { userId: auth.userId } });

  const gaSecret = input.gaApiSecret === undefined
    ? existing?.gaApiSecretEncrypted ?? null
    : input.gaApiSecret
      ? encryptSecret(input.gaApiSecret)
      : null;
  const metaToken = input.metaAccessToken === undefined
    ? existing?.metaAccessTokenEncrypted ?? null
    : input.metaAccessToken
      ? encryptSecret(input.metaAccessToken)
      : null;

  const item = await prisma.integration.upsert({
    where: { userId: auth.userId },
    update: {
      gaMeasurementId: input.gaMeasurementId === undefined ? existing?.gaMeasurementId : input.gaMeasurementId || null,
      gaApiSecretEncrypted: gaSecret,
      metaPixelId: input.metaPixelId === undefined ? existing?.metaPixelId : input.metaPixelId || null,
      metaAccessTokenEncrypted: metaToken,
    },
    create: {
      userId: auth.userId,
      gaMeasurementId: input.gaMeasurementId || null,
      gaApiSecretEncrypted: gaSecret,
      metaPixelId: input.metaPixelId || null,
      metaAccessTokenEncrypted: metaToken,
    },
  });

  return NextResponse.json({
    success: true,
    integration: {
      gaMeasurementId: item.gaMeasurementId,
      gaApiSecretConfigured: Boolean(item.gaApiSecretEncrypted),
      metaPixelId: item.metaPixelId,
      metaAccessTokenConfigured: Boolean(item.metaAccessTokenEncrypted),
    },
  });
}
