import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { UserRole } from "@/generated/prisma/enums";

export const AUTH_COOKIE_NAME = "qrcode_auth";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

type AuthClaims = JWTPayload & {
  userId: string;
  email: string;
  role: UserRole;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET deve possuir pelo menos 32 caracteres.");
  }
  return new TextEncoder().encode(secret);
}

export async function signAuthToken(input: {
  userId: string;
  email: string;
  role: UserRole;
}): Promise<string> {
  return new SignJWT(input)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      (payload.role !== "USER" && payload.role !== "ADMIN")
    ) {
      return null;
    }
    return payload as AuthClaims;
  } catch {
    return null;
  }
}

export async function getAuthClaims(): Promise<AuthClaims | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE_NAME)?.value;
  return token ? verifyAuthToken(token) : null;
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  };
}
