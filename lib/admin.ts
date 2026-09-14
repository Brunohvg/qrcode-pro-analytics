import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getAuthClaims } from "@/lib/auth";

export const ADMIN_ACCESS_COOKIE_NAME = "qrcode_admin_access";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 2;

type AdminIdentity = {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
};

function configuredAdminEmails(): Set<string> {
  return new Set(
    (process.env.DEVELOPER_ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function adminJwtSecret(): Uint8Array {
  const base = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!base || base.length < 32) {
    throw new Error("AUTH_SECRET deve possuir pelo menos 32 caracteres.");
  }
  return new TextEncoder().encode(`${base}:developer-admin`);
}

function safeHash(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isDeveloperAdmin(claims: { email: string; role: "USER" | "ADMIN" } | null): boolean {
  if (!claims) return false;
  if (claims.role === "ADMIN") return true;
  return configuredAdminEmails().has(claims.email.toLowerCase());
}

export function isAdminPasswordConfigured(): boolean {
  return Boolean(process.env.DEVELOPER_ADMIN_PASSWORD?.trim());
}

export function verifyDeveloperAdminPassword(password: string): boolean {
  const expected = process.env.DEVELOPER_ADMIN_PASSWORD ?? "";
  if (!expected || !password) return false;
  return timingSafeEqual(safeHash(password), safeHash(expected));
}

export async function signDeveloperAdminToken(input: { userId: string; email: string }): Promise<string> {
  return new SignJWT({ email: input.email, purpose: "developer-admin" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_TTL_SECONDS}s`)
    .sign(adminJwtSecret());
}

export async function verifyDeveloperAdminToken(token: string, userId: string, email: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, adminJwtSecret(), { algorithms: ["HS256"] });
    return payload.sub === userId && payload.email === email && payload.purpose === "developer-admin";
  } catch {
    return false;
  }
}

export function adminAccessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  };
}

export async function hasDeveloperAdminSession(claims?: AdminIdentity | null): Promise<boolean> {
  const current = claims ?? await getAuthClaims();
  if (!current || !isDeveloperAdmin(current)) return false;
  if (!isAdminPasswordConfigured()) return false;
  const store = await cookies();
  const token = store.get(ADMIN_ACCESS_COOKIE_NAME)?.value;
  return token ? verifyDeveloperAdminToken(token, current.userId, current.email) : false;
}

export async function requireDeveloperAdminIdentity() {
  const claims = await getAuthClaims();
  return isDeveloperAdmin(claims) ? claims : null;
}

export async function requireDeveloperAdmin() {
  const claims = await requireDeveloperAdminIdentity();
  if (!claims) return null;
  return await hasDeveloperAdminSession(claims) ? claims : null;
}
