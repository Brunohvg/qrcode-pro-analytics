import QRCode from "qrcode";
import { getAuthClaims } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, { params }: Context) {
  const auth = await getAuthClaims();
  if (!auth) return new Response("Não autenticado", { status: 401 });
  const { id } = await params;

  const item = await prisma.qRCode.findFirst({
    where: { id, userId: auth.userId },
    select: { name: true, slug: true },
  });
  if (!item) return new Response("QR Code não encontrado", { status: 404 });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const redirectUrl = `${appUrl}/r/${item.slug}`;
  const svg = await QRCode.toString(redirectUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
  });

  const download = new URL(request.url).searchParams.get("download") === "1";
  const safeName = item.name.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "qrcode";
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, no-store",
      ...(download ? { "Content-Disposition": `attachment; filename="${safeName}.svg"` } : {}),
    },
  });
}
