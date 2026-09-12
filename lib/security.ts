import { NextResponse } from "next/server";

export function rejectCrossSiteMutation(request: Request): NextResponse | null {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return NextResponse.json(
      { success: false, message: "Requisição entre sites bloqueada." },
      { status: 403 },
    );
  }
  return null;
}
