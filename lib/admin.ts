import { getAuthClaims } from "@/lib/auth";

function configuredAdminEmails(): Set<string> {
  return new Set(
    (process.env.DEVELOPER_ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isDeveloperAdmin(claims: { email: string; role: "USER" | "ADMIN" } | null): boolean {
  if (!claims) return false;
  if (claims.role === "ADMIN") return true;
  return configuredAdminEmails().has(claims.email.toLowerCase());
}

export async function requireDeveloperAdmin() {
  const claims = await getAuthClaims();
  return isDeveloperAdmin(claims) ? claims : null;
}
