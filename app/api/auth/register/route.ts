import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, authCookieOptions, signAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { rejectCrossSiteMutation } from "@/lib/security";
import { registerSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;

  const rate = consumeRateLimit(`register:${getClientIp(request.headers)}`, 5);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, message: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Revise os dados informados.", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const email = parsed.data.email;
    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) {
      return NextResponse.json(
        { success: false, message: "Já existe uma conta com este e-mail." },
        { status: 409 },
      );
    }

    const password = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const plan = await tx.plan.upsert({
        where: { name: "Gratuito" },
        update: {},
        create: { id: "plan_free", name: "Gratuito", qrLimit: 3, dynamicLinks: true, price: "0.00" },
      });
      const created = await tx.user.create({
        data: { email, password },
        select: { id: true, email: true, role: true, createdAt: true },
      });
      await tx.subscription.create({
        data: { userId: created.id, planId: plan.id, status: "ACTIVE" },
      });
      return created;
    });

    const token = await signAuthToken({ userId: user.id, email: user.email, role: user.role });
    const response = NextResponse.json({ success: true, user }, { status: 201 });
    response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions());
    return response;
  } catch (error) {
    console.error("REGISTER_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Não foi possível criar a conta." },
      { status: 500 },
    );
  }
}
