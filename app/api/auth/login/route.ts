import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, authCookieOptions, signAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { rejectCrossSiteMutation } from "@/lib/security";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;

  try {
    const body: unknown = await request.json();
    const parsed = loginSchema.safeParse(body);
    const emailHint = parsed.success ? parsed.data.email : "invalid";
    const rate = consumeRateLimit(`login:${getClientIp(request.headers)}:${emailHint}`, 8);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, message: "Muitas tentativas. Aguarde e tente novamente." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "E-mail ou senha inválidos." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, email: true, password: true, role: true, createdAt: true },
    });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.password))) {
      return NextResponse.json(
        { success: false, message: "E-mail ou senha incorretos." },
        { status: 401 },
      );
    }

    const token = await signAuthToken({ userId: user.id, email: user.email, role: user.role });
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
    });
    response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions());
    return response;
  } catch (error) {
    console.error("LOGIN_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Não foi possível realizar o login." },
      { status: 500 },
    );
  }
}
