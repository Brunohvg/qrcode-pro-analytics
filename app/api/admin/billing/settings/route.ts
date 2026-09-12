import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDeveloperAdmin } from "@/lib/admin";
import { getBillingSettings } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";

const schema = z.object({
  mercadoPagoEnabled: z.boolean(),
  manualPixEnabled: z.boolean(),
  pixKey: z.string().trim().max(180).nullable(),
  pixKeyType: z.string().trim().max(40).nullable(),
  pixRecipientName: z.string().trim().max(120).nullable(),
  pixCity: z.string().trim().max(80).nullable(),
  manualPixInstructions: z.string().trim().max(1000).nullable(),
  gracePeriodDays: z.number().int().min(0).max(30),
});

export async function GET() {
  const admin = await requireDeveloperAdmin();
  if (!admin) return NextResponse.json({ success: false }, { status: 403 });
  return NextResponse.json({ success: true, settings: await getBillingSettings() });
}

export async function PATCH(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const admin = await requireDeveloperAdmin();
  if (!admin) return NextResponse.json({ success: false }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Configuração inválida." }, { status: 400 });

  const clean = {
    ...parsed.data,
    pixKey: parsed.data.pixKey || null,
    pixKeyType: parsed.data.pixKeyType || null,
    pixRecipientName: parsed.data.pixRecipientName || null,
    pixCity: parsed.data.pixCity || null,
    manualPixInstructions: parsed.data.manualPixInstructions || null,
  };
  const settings = await prisma.billingSettings.upsert({
    where: { id: "default" },
    update: clean,
    create: { id: "default", ...clean },
  });

  return NextResponse.json({ success: true, settings });
}
