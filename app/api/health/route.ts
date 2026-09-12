import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.plan.count();
    return NextResponse.json({ status: "ok", database: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("HEALTH_ERROR", error);
    return NextResponse.json({ status: "degraded", database: "error", timestamp: new Date().toISOString() }, { status: 503 });
  }
}
