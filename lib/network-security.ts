import { isIP } from "node:net";
import { resolve4, resolve6 } from "node:dns/promises";

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(ip: string): boolean {
  const value = ip.toLowerCase();
  return (
    value === "::" ||
    value === "::1" ||
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb") ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("ff") ||
    value.startsWith("::ffff:127.") ||
    value.startsWith("::ffff:10.") ||
    value.startsWith("::ffff:192.168.")
  );
}

function isBlockedIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return true;
}

export async function assertPublicHttpUrl(value: string): Promise<URL> {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Somente HTTP/HTTPS é permitido.");
  if (url.username || url.password) throw new Error("Credenciais na URL não são permitidas.");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("A porta informada não é permitida.");

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa")
  ) {
    throw new Error("Endereços locais não são permitidos.");
  }

  if (isIP(host)) {
    if (isBlockedIp(host)) throw new Error("Endereços de rede privada não são permitidos.");
    return url;
  }

  const [ipv4, ipv6] = await Promise.all([
    resolve4(host).catch(() => [] as string[]),
    resolve6(host).catch(() => [] as string[]),
  ]);
  const addresses = [...ipv4, ...ipv6];
  if (!addresses.length) throw new Error("O domínio não pôde ser resolvido.");
  if (addresses.some(isBlockedIp)) throw new Error("O domínio aponta para uma rede privada ou reservada.");

  return url;
}
