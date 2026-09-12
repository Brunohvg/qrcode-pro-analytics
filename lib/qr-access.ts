import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE_SECONDS = 60 * 60 * 12;

function secret(): string {
  const value = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET inválido.");
  return value;
}

export function qrUnlockCookieName(slug: string): string {
  return `qr_unlock_${slug.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export function createQrUnlockToken(slug: string): string {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${slug}.${expires}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${expires}.${signature}`;
}

export function verifyQrUnlockToken(slug: string, token: string | undefined): boolean {
  if (!token) return false;
  const [expiresText, signature] = token.split(".");
  const expires = Number(expiresText);
  if (!Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000) || !signature) return false;

  const payload = `${slug}.${expires}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export const qrUnlockCookieMaxAge = MAX_AGE_SECONDS;
