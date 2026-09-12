import type { DeviceType } from "@/generated/prisma/enums";

export function detectDevice(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "IOS";
  if (ua.includes("android")) return "ANDROID";
  return "DESKTOP";
}

export function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/") || ua.includes("edgios") || ua.includes("edga")) return "Edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("firefox/") || ua.includes("fxios/")) return "Firefox";
  if (ua.includes("chrome/") || ua.includes("crios/")) return "Chrome";
  if (ua.includes("safari/") && !ua.includes("chrome/") && !ua.includes("crios/")) return "Safari";
  return "Unknown";
}

export function detectCountry(headers: Headers): string {
  for (const key of ["cf-ipcountry", "x-vercel-ip-country", "x-country-code", "x-country"]) {
    const value = headers.get(key)?.trim();
    if (value) return value.toUpperCase().slice(0, 32);
  }
  return "Unknown";
}

export function getClientIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}
