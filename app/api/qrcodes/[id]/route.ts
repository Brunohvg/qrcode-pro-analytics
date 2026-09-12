import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription, isAdvancedPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";
import { updateQrSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

function parseDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(_request: Request, { params }: Context) {
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const { id } = await params;

  const [item, subscription] = await Promise.all([
    prisma.qRCode.findFirst({
      where: { id, userId: auth.userId },
      include: {
        campaign: { select: { id: true, name: true, color: true } },
        customDomain: { select: { id: true, host: true, verifiedAt: true } },
      },
    }),
    getActiveSubscription(auth.userId),
  ]);

  if (!item) return NextResponse.json({ success: false, message: "QR Code não encontrado." }, { status: 404 });

  const { passwordHash: _passwordHash, ...safeItem } = item;
  return NextResponse.json({ success: true, item: safeItem, plan: subscription.plan });
}

export async function PATCH(request: Request, { params }: Context) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const { id } = await params;

  const [existing, subscription] = await Promise.all([
    prisma.qRCode.findFirst({ where: { id, userId: auth.userId }, select: { id: true } }),
    getActiveSubscription(auth.userId),
  ]);
  if (!existing) return NextResponse.json({ success: false, message: "QR Code não encontrado." }, { status: 404 });

  const parsed = updateQrSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Dados inválidos.", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const plan = subscription.plan;

  if (input.originalUrl !== undefined && !plan.dynamicLinks) {
    return NextResponse.json({ success: false, message: "Seu plano não permite alterar links dinâmicos." }, { status: 403 });
  }

  if (input.campaignId !== undefined && !plan.campaigns) {
    return NextResponse.json({ success: false, message: "Campanhas estão disponíveis a partir do plano Pro." }, { status: 403 });
  }

  if (input.campaignId) {
    const campaign = await prisma.campaign.findFirst({ where: { id: input.campaignId, userId: auth.userId }, select: { id: true } });
    if (!campaign) return NextResponse.json({ success: false, message: "Campanha inválida." }, { status: 400 });
  }

  const usesScheduling = input.activeFrom !== undefined || input.expiresAt !== undefined || input.fallbackUrl !== undefined;
  if (usesScheduling && !plan.scheduledLinks) {
    return NextResponse.json({ success: false, message: "Agendamento e expiração estão disponíveis a partir do plano Pro." }, { status: 403 });
  }

  if ((input.password !== undefined || input.passwordPrompt !== undefined) && !plan.passwordProtection) {
    return NextResponse.json({ success: false, message: "Proteção por senha está disponível a partir do plano Pro." }, { status: 403 });
  }

  const usesSmartRedirect =
    input.iosUrl !== undefined ||
    input.androidUrl !== undefined ||
    input.desktopUrl !== undefined ||
    input.countryRules !== undefined;
  if (usesSmartRedirect && !plan.smartRedirect) {
    return NextResponse.json({ success: false, message: "Smart Redirect está disponível no plano Business." }, { status: 403 });
  }

  const usesBranding =
    input.foregroundColor !== undefined ||
    input.accentColor !== undefined ||
    input.frameTitle !== undefined ||
    input.frameText !== undefined ||
    input.brandName !== undefined ||
    input.logoUrl !== undefined;
  if (usesBranding && !plan.customBranding) {
    return NextResponse.json({ success: false, message: "Personalização avançada está disponível a partir do plano Pro." }, { status: 403 });
  }

  if (input.customDomainId !== undefined && !plan.customDomains) {
    return NextResponse.json({ success: false, message: "Domínio próprio está disponível no plano Business." }, { status: 403 });
  }

  if (input.customDomainId) {
    const domain = await prisma.customDomain.findFirst({
      where: { id: input.customDomainId, userId: auth.userId, verifiedAt: { not: null } },
      select: { id: true },
    });
    if (!domain) return NextResponse.json({ success: false, message: "Domínio não verificado ou inválido." }, { status: 400 });
  }

  const activeFrom = parseDate(input.activeFrom);
  const expiresAt = parseDate(input.expiresAt);
  if (input.activeFrom && activeFrom === undefined) {
    return NextResponse.json({ success: false, message: "Data de início inválida." }, { status: 400 });
  }
  if (input.expiresAt && expiresAt === undefined) {
    return NextResponse.json({ success: false, message: "Data de expiração inválida." }, { status: 400 });
  }
  if (activeFrom instanceof Date && expiresAt instanceof Date && activeFrom >= expiresAt) {
    return NextResponse.json({ success: false, message: "A expiração deve ocorrer depois da data de início." }, { status: 400 });
  }

  let passwordHash: string | null | undefined;
  if (input.password !== undefined) {
    passwordHash = input.password ? await bcrypt.hash(input.password, 12) : null;
  }

  const item = await prisma.qRCode.update({
    where: { id },
    data: {
      name: input.name,
      originalUrl: input.originalUrl,
      campaignId: input.campaignId,
      customDomainId: input.customDomainId,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      activeFrom,
      expiresAt,
      fallbackUrl: input.fallbackUrl === "" ? null : input.fallbackUrl,
      passwordHash,
      passwordPrompt: input.passwordPrompt,
      iosUrl: input.iosUrl === "" ? null : input.iosUrl,
      androidUrl: input.androidUrl === "" ? null : input.androidUrl,
      desktopUrl: input.desktopUrl === "" ? null : input.desktopUrl,
      countryRules:
        input.countryRules === undefined
          ? undefined
          : input.countryRules === null
            ? Prisma.JsonNull
            : input.countryRules,
      notifyAtScans: input.notifyAtScans,
      foregroundColor: input.foregroundColor,
      accentColor: input.accentColor,
      frameTitle: input.frameTitle,
      frameText: input.frameText,
      brandName: input.brandName,
      logoUrl: input.logoUrl === "" ? null : input.logoUrl,
    },
    include: {
      campaign: { select: { id: true, name: true, color: true } },
      customDomain: { select: { id: true, host: true, verifiedAt: true } },
    },
  });

  const { passwordHash: _hidden, ...safeItem } = item;
  return NextResponse.json({ success: true, item: safeItem, advanced: isAdvancedPlan(plan.name) });
}

export async function DELETE(request: Request, { params }: Context) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const { id } = await params;

  const deleted = await prisma.qRCode.deleteMany({ where: { id, userId: auth.userId } });
  if (deleted.count === 0) {
    return NextResponse.json({ success: false, message: "QR Code não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
