import QRCode from "qrcode";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getPublicOrigin } from "@/lib/public-url";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeHexColor(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : fallback;
}

function qrDarkColor(value: string | null | undefined): string {
  const color = sanitizeHexColor(value, "#111827");
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance <= 0.62 ? color : "#111827";
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function compactText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function safeFileName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "qrcode";
}

function safeImageUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: Context) {
  const auth = await getAuthClaims();
  if (!auth) return new Response("Não autenticado", { status: 401 });

  const { id } = await params;
  const [item, subscription] = await Promise.all([
    prisma.qRCode.findFirst({
      where: { id, userId: auth.userId },
      select: {
        name: true,
        slug: true,
        foregroundColor: true,
        accentColor: true,
        frameTitle: true,
        frameText: true,
        brandName: true,
        logoUrl: true,
        customDomain: { select: { host: true, verifiedAt: true } },
      },
    }),
    getActiveSubscription(auth.userId),
  ]);
  if (!item) return new Response("QR Code não encontrado", { status: 404 });

  const requestUrl = new URL(request.url);
  const canBrand = subscription.plan.customBranding;
  const canUseCustomDomain = subscription.plan.customDomains;
  const defaultOrigin = getPublicOrigin(request).replace(/\/$/, "");
  const publicOrigin = canUseCustomDomain && item.customDomain?.verifiedAt ? `https://${item.customDomain.host}` : defaultOrigin;
  const redirectUrl = `${publicOrigin}/r/${item.slug}`;
  const variant = requestUrl.searchParams.get("variant") === "card" ? "card" : "plain";
  const download = requestUrl.searchParams.get("download") === "1";

  const foreground = canBrand
    ? qrDarkColor(requestUrl.searchParams.get("foreground") || item.foregroundColor)
    : "#111827";
  const accent = canBrand
    ? sanitizeHexColor(requestUrl.searchParams.get("accent") || item.accentColor, "#10B981")
    : "#10B981";
  const title = compactText(canBrand ? requestUrl.searchParams.get("title") || item.frameTitle || item.name : item.name, 44);
  const subtitle = compactText(
    canBrand ? requestUrl.searchParams.get("subtitle") || item.frameText || "Aponte a câmera do celular para acessar" : "Aponte a câmera do celular para acessar",
    72,
  );
  const brand = compactText(canBrand ? requestUrl.searchParams.get("brand") || item.brandName || "QR Metrics Pro" : "QR Metrics Pro", 32);
  const logo = canBrand ? safeImageUrl(requestUrl.searchParams.get("logo") || item.logoUrl) : null;

  const plainSvg = await QRCode.toString(redirectUrl, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 3,
    width: 1024,
    color: { dark: foreground, light: "#FFFFFF" },
  });
  const safeName = safeFileName(item.name);

  if (variant === "plain") {
    return new Response(plainSvg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        ...(download ? { "Content-Disposition": `attachment; filename="${safeName}-qr.svg"` } : {}),
      },
    });
  }

  const encodedQr = Buffer.from(plainSvg, "utf8").toString("base64");
  const hostLabel = new URL(publicOrigin).host;
  const logoMarkup = logo
    ? `<rect x="650" y="36" width="94" height="94" rx="18" fill="#FFFFFF" opacity="0.96"/><image href="${escapeXml(logo)}" x="662" y="48" width="70" height="70" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  const cardSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">QR Code dinâmico para ${escapeXml(title)}</desc>
  <rect width="800" height="1000" rx="48" fill="#F8FAFC"/>
  <rect width="800" height="166" rx="48" fill="${accent}"/>
  <rect y="118" width="800" height="48" fill="${accent}"/>
  <text x="56" y="76" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#FFFFFF" opacity="0.96">${escapeXml(brand)}</text>
  <text x="56" y="124" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="500" fill="#FFFFFF" opacity="0.84">QR Code dinâmico • link atualizável</text>
  ${logoMarkup}
  <text x="400" y="225" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="35" font-weight="800" fill="#0F172A">${escapeXml(title)}</text>
  <rect x="94" y="270" width="612" height="612" rx="42" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="3"/>
  <rect x="115" y="291" width="570" height="570" rx="30" fill="#FFFFFF"/>
  <image href="data:image/svg+xml;base64,${encodedQr}" x="139" y="315" width="522" height="522" preserveAspectRatio="xMidYMid meet"/>
  <circle cx="400" cy="905" r="5" fill="${accent}"/>
  <text x="400" y="934" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="700" fill="#334155">${escapeXml(subtitle)}</text>
  <text x="400" y="967" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="500" fill="#64748B">${escapeXml(hostLabel)}</text>
</svg>`;

  return new Response(cardSvg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      ...(download ? { "Content-Disposition": `attachment; filename="${safeName}-cartao.svg"` } : {}),
    },
  });
}
