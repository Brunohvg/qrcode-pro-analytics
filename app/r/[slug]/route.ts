import { after, NextResponse } from "next/server";
import { getActiveSubscription, isAdvancedPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { detectBrowser, detectCountry, detectDevice } from "@/lib/request";
import { qrPasswordPage, qrStatusPage } from "@/lib/qr-html";
import { qrUnlockCookieName, verifyQrUnlockToken } from "@/lib/qr-access";
import { dispatchScanEvents } from "@/lib/scan-events";

type Context = { params: Promise<{ slug: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cookieValue(request: Request, name: string): string | undefined {
  const cookie = request.headers.get("cookie");
  if (!cookie) return undefined;
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function validHttpUrl(value: string | null | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function applyUtm(url: URL, input: { utmSource: string | null; utmMedium: string | null; utmCampaign: string | null }): URL {
  const output = new URL(url);
  if (input.utmSource) output.searchParams.set("utm_source", input.utmSource);
  if (input.utmMedium) output.searchParams.set("utm_medium", input.utmMedium);
  if (input.utmCampaign) output.searchParams.set("utm_campaign", input.utmCampaign);
  return output;
}

function countryDestination(rules: unknown, country: string): string | null {
  if (!rules || typeof rules !== "object" || Array.isArray(rules)) return null;
  const record = rules as Record<string, unknown>;
  const candidate = record[country.toUpperCase()];
  return typeof candidate === "string" ? candidate : null;
}

function htmlResponse(html: string, status: number): Response {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function GET(request: Request, { params }: Context) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ message: "QR Code inválido." }, { status: 400 });

  try {
    const qr = await prisma.qRCode.findUnique({
      where: { slug },
      select: {
        id: true,
        userId: true,
        name: true,
        originalUrl: true,
        slug: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        activeFrom: true,
        expiresAt: true,
        fallbackUrl: true,
        passwordHash: true,
        passwordPrompt: true,
        iosUrl: true,
        androidUrl: true,
        desktopUrl: true,
        countryRules: true,
        notifyAtScans: true,
      },
    });
    if (!qr) {
      return htmlResponse(qrStatusPage({ title: "QR Code não encontrado", message: "Este código não existe ou foi removido.", status: "Indisponível" }), 404);
    }

    const subscription = await getActiveSubscription(qr.userId);
    const plan = subscription.plan;
    const advanced = isAdvancedPlan(plan.name);

    if (plan.scheduledLinks) {
      const now = new Date();
      const inactive = (qr.activeFrom && now < qr.activeFrom) || (qr.expiresAt && now > qr.expiresAt);
      if (inactive) {
        const fallback = validHttpUrl(qr.fallbackUrl);
        if (fallback) return NextResponse.redirect(fallback, 302);
        const notStarted = Boolean(qr.activeFrom && now < qr.activeFrom);
        return htmlResponse(
          qrStatusPage({
            title: notStarted ? "Campanha ainda não começou" : "Campanha encerrada",
            message: notStarted ? "Este QR Code foi programado para começar em outra data." : "O período de validade deste QR Code terminou.",
            status: notStarted ? "Agendado" : "Expirado",
          }),
          410,
        );
      }
    }

    if (plan.passwordProtection && qr.passwordHash) {
      const unlocked = verifyQrUnlockToken(slug, cookieValue(request, qrUnlockCookieName(slug)));
      if (!unlocked) {
        const hasError = new URL(request.url).searchParams.get("error") === "1";
        return htmlResponse(
          qrPasswordPage({ slug, name: qr.name, prompt: qr.passwordPrompt, error: hasError ? "Senha incorreta. Tente novamente." : undefined }),
          401,
        );
      }
    }

    const userAgent = request.headers.get("user-agent") ?? "";
    const device = detectDevice(userAgent);
    const browser = detectBrowser(userAgent);
    const country = detectCountry(request.headers);

    const smartCountryUrl = plan.smartRedirect ? countryDestination(qr.countryRules, country) : null;
    const smartDeviceUrl = plan.smartRedirect
      ? device === "IOS" ? qr.iosUrl : device === "ANDROID" ? qr.androidUrl : qr.desktopUrl
      : null;
    const destination = validHttpUrl(smartCountryUrl) ?? validHttpUrl(smartDeviceUrl) ?? validHttpUrl(qr.originalUrl);
    if (!destination) {
      return htmlResponse(qrStatusPage({ title: "Destino inválido", message: "O responsável por este QR Code precisa revisar a URL configurada.", status: "Erro de configuração" }), 500);
    }

    const finalDestination = advanced ? applyUtm(destination, qr) : destination;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const metric = await tx.scanMetric.create({
          data: { qrCodeId: qr.id, device, browser, country },
          select: { id: true, scannedAt: true },
        });
        const updated = await tx.qRCode.update({
          where: { id: qr.id },
          data: { scanCount: { increment: 1 } },
          select: { scanCount: true, notifyAtScans: true, lastNotifiedAtCount: true },
        });

        if (
          advanced &&
          updated.notifyAtScans &&
          updated.scanCount >= updated.notifyAtScans &&
          updated.lastNotifiedAtCount < updated.notifyAtScans
        ) {
          await tx.notification.create({
            data: {
              userId: qr.userId,
              qrCodeId: qr.id,
              type: "SCAN_MILESTONE",
              title: `${qr.name} atingiu ${updated.notifyAtScans} scans`,
              message: `Seu QR Code alcançou a meta de ${updated.notifyAtScans} leituras.`,
            },
          });
          await tx.qRCode.update({ where: { id: qr.id }, data: { lastNotifiedAtCount: updated.notifyAtScans } });
        }

        return metric;
      });

      if (plan.webhooks || plan.integrations) {
        after(async () => {
          await dispatchScanEvents({
            id: result.id,
            qrCodeId: qr.id,
            qrName: qr.name,
            userId: qr.userId,
            slug: qr.slug,
            destination: finalDestination.toString(),
            device,
            browser,
            country,
            scannedAt: result.scannedAt.toISOString(),
            userAgent,
          });
        });
      }
    } catch (metricError) {
      console.error("QR_METRIC_ERROR", metricError);
    }

    return NextResponse.redirect(finalDestination, 302);
  } catch (error) {
    console.error("QR_REDIRECT_ERROR", error);
    return htmlResponse(qrStatusPage({ title: "Não foi possível abrir este QR Code", message: "Tente novamente em instantes.", status: "Erro temporário" }), 500);
  }
}
