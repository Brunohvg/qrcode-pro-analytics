import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { isDeveloperAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const claims = await getAuthClaims();

  if (!claims) {
    return NextResponse.json({ authenticated: false, admin: false }, { status: 200 });
  }

  return NextResponse.json(
    {
      authenticated: true,
      admin: isDeveloperAdmin(claims),
      email: claims.email,
      role: claims.role,
    },
    { status: 200, headers: { "Cache-Control": "private, no-store" } },
  );
}
