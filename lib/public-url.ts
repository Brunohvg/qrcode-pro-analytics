function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function normalizeConfiguredOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getPublicOrigin(request: Request): string {
  const configured =
    normalizeConfiguredOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeConfiguredOrigin(process.env.APP_URL);

  if (configured) return configured;

  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost ?? firstHeaderValue(request.headers.get("host"));

  const requestUrl = new URL(request.url);
  const resolvedHost = host ?? requestUrl.host;

  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const protocol =
    forwardedProto === "https" || forwardedProto === "http"
      ? forwardedProto
      : requestUrl.protocol.replace(":", "");

  return `${protocol}://${resolvedHost}`;
}
