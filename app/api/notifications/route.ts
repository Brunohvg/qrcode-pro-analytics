import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, type: true, title: true, message: true, readAt: true, createdAt: true, qrCodeId: true },
    }),
    prisma.notification.count({ where: { userId: auth.userId, readAt: null } }),
  ]);
  return NextResponse.json({ success: true, items, unread });
}

export async function PATCH(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown; all?: unknown } | null;
  if (body?.all === true) {
    await prisma.notification.updateMany({ where: { userId: auth.userId, readAt: null }, data: { readAt: new Date() } });
    return NextResponse.json({ success: true });
  }
  if (typeof body?.id !== "string") return NextResponse.json({ success: false, message: "Notificação inválida." }, { status: 400 });
  await prisma.notification.updateMany({ where: { id: body.id, userId: auth.userId }, data: { readAt: new Date() } });
  return NextResponse.json({ success: true });
}
