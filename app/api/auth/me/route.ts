import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveSubscription } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await getAuthClaims();
    if (!auth) return NextResponse.json({ success: false }, { status: 401 });
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ success: false }, { status: 401 });
    const subscription = await getActiveSubscription(user.id);
    return NextResponse.json({
      success: true,
      user,
      subscription: {
        status: subscription.status,
        activeUntil: subscription.activeUntil,
        plan: {
          name: subscription.plan.name,
          qrLimit: subscription.plan.qrLimit,
          dynamicLinks: subscription.plan.dynamicLinks,
          price: subscription.plan.price.toString(),
        },
      },
    });
  } catch (error) {
    console.error("AUTH_ME_ERROR", error);
    return NextResponse.json({ success: false, message: "Erro ao carregar a sessão." }, { status: 500 });
  }
}
