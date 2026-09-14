import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_ACCESS_COOKIE_NAME,
  adminAccessCookieOptions,
  isAdminPasswordConfigured,
  requireDeveloperAdminIdentity,
  signDeveloperAdminToken,
  verifyDeveloperAdminPassword,
} from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireDeveloperAdminIdentity();
  if (!admin) {
    return NextResponse.json({ message: "Acesso não autorizado." }, { status: 403 });
  }

  if (!isAdminPasswordConfigured()) {
    return NextResponse.json({ message: "DEVELOPER_ADMIN_PASSWORD não está configurada no servidor." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!verifyDeveloperAdminPassword(password)) {
    return NextResponse.json({ message: "Senha administrativa inválida." }, { status: 401 });
  }

  const token = await signDeveloperAdminToken({ userId: admin.userId, email: admin.email });
  const store = await cookies();
  store.set(ADMIN_ACCESS_COOKIE_NAME, token, adminAccessCookieOptions());

  return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
}

export async function DELETE() {
  const store = await cookies();
  store.set(ADMIN_ACCESS_COOKIE_NAME, "", { ...adminAccessCookieOptions(), maxAge: 0 });
  return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
