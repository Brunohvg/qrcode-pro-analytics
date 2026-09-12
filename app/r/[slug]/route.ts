import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectBrowser, detectCountry, detectDevice } from "@/lib/request";

type Context = { params: Promise<{ slug: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: Context) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ message: "QR Code inválido." }, { status: 400 });

  try {
    const qr = await prisma.qRCode.findUnique({ where: { slug }, select: { id: true, originalUrl: true } });
    if (!qr) return NextResponse.json({ message: "QR Code não encontrado." }, { status: 404 });

    let destination: URL;
    try {
      destination = new URL(qr.originalUrl);
      if (destination.protocol !== "http:" && destination.protocol !== "https:") throw new Error("invalid-protocol");
    } catch {
      return NextResponse.json({ message: "Destino inválido." }, { status: 500 });
    }

    const userAgent = request.headers.get("user-agent") ?? "";
    try {
      await prisma.$transaction([
        prisma.scanMetric.create({
          data: {
            qrCodeId: qr.id,
            device: detectDevice(userAgent),
            browser: detectBrowser(userAgent),
            country: detectCountry(request.headers),
          },
        }),
        prisma.qRCode.update({ where: { id: qr.id }, data: { scanCount: { increment: 1 } } }),
      ]);
    } catch (metricError) {
      console.error("QR_METRIC_ERROR", metricError);
    }

    return NextResponse.redirect(destination, 302);
  } catch (error) {
    console.error("QR_REDIRECT_ERROR", error);
    return NextResponse.json({ message: "Não foi possível processar o QR Code." }, { status: 500 });
  }
}
