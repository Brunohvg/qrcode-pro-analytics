import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export function createApiToken(): { token: string; prefix: string; hash: string } {
  const prefix = randomBytes(6).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  const token = `qrp_${prefix}_${secret}`;
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, prefix, hash };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function authenticateApiRequest(request: Request): Promise<{ userId: string } | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  const match = /^qrp_([a-f0-9]{12})_[A-Za-z0-9_-]+$/.exec(token);
  if (!match) return null;

  const apiKey = await prisma.apiKey.findUnique({
    where: { prefix: match[1] },
    select: { id: true, userId: true, secretHash: true, revokedAt: true },
  });
  if (!apiKey || apiKey.revokedAt) return null;

  const actual = hashToken(token);
  if (actual.length !== apiKey.secretHash.length) return null;
  if (!timingSafeEqual(Buffer.from(actual), Buffer.from(apiKey.secretHash))) return null;

  const subscription = await getActiveSubscription(apiKey.userId);
  if (!subscription.plan.apiAccess) return null;

  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  return { userId: apiKey.userId };
}
