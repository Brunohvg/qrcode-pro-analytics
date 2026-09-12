import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createQrUnlockToken, qrUnlockCookieMaxAge, qrUnlockCookieName } from "@/lib/qr-access";

type Context = { params: Promise<{ slug: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: Context) {
  const { slug } = await params;
  const form = await request.formData();
  const password = form.get("password");
  if (typeof password !== "string" || !password || password.length > 128) {
    return NextResponse.redirect(new URL(`/r/${encodeURIComponent(slug)}?error=1`, request.url), 303);
  }

  const qr = await prisma.qRCode.findUnique({ where: { slug }, select: { passwordHash: true } });
  if (!qr?.passwordHash) return NextResponse.redirect(new URL(`/r/${encodeURIComponent(slug)}`, request.url), 303);

  const valid = await bcrypt.compare(password, qr.passwordHash);
  if (!valid) return NextResponse.redirect(new URL(`/r/${encodeURIComponent(slug)}?error=1`, request.url), 303);

  const response = NextResponse.redirect(new URL(`/r/${encodeURIComponent(slug)}`, request.url), 303);
  response.cookies.set(qrUnlockCookieName(slug), createQrUnlockToken(slug), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/r/${slug}`,
    maxAge: qrUnlockCookieMaxAge,
  });
  return response;
}
