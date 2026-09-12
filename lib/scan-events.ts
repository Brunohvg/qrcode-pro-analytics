import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secrets";

type ScanEvent = {
  id: string;
  qrCodeId: string;
  qrName: string;
  userId: string;
  slug: string;
  destination: string;
  device: "IOS" | "ANDROID" | "DESKTOP";
  browser: string;
  country: string;
  scannedAt: string;
  userAgent: string;
};

async function sendWebhook(url: string, encryptedSecret: string, event: ScanEvent): Promise<void> {
  const body = JSON.stringify({ type: "scan.created", data: event });
  const secret = decryptSecret(encryptedSecret);
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "QR-Metrics-Pro-Webhook/1.0",
      "X-QR-Event": "scan.created",
      "X-QR-Signature": `sha256=${signature}`,
    },
    body,
    signal: AbortSignal.timeout(2500),
  });
}

async function sendGoogleAnalytics(
  measurementId: string,
  encryptedSecret: string,
  event: ScanEvent,
): Promise<void> {
  const apiSecret = decryptSecret(encryptedSecret);
  const endpoint = new URL("https://www.google-analytics.com/mp/collect");
  endpoint.searchParams.set("measurement_id", measurementId);
  endpoint.searchParams.set("api_secret", apiSecret);

  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: `qr.${event.id}`,
      events: [
        {
          name: "qr_code_scan",
          params: {
            qr_code_id: event.qrCodeId,
            qr_code_name: event.qrName,
            qr_slug: event.slug,
            device: event.device.toLowerCase(),
            browser: event.browser,
            country: event.country,
            destination: event.destination,
            engagement_time_msec: 1,
          },
        },
      ],
    }),
    signal: AbortSignal.timeout(2500),
  });
}

async function sendMeta(
  pixelId: string,
  encryptedToken: string,
  event: ScanEvent,
): Promise<void> {
  const accessToken = decryptSecret(encryptedToken);
  const endpoint = new URL(`https://graph.facebook.com/${encodeURIComponent(pixelId)}/events`);
  endpoint.searchParams.set("access_token", accessToken);

  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        {
          event_name: "QRCodeScan",
          event_time: Math.floor(new Date(event.scannedAt).getTime() / 1000),
          event_id: event.id,
          action_source: "website",
          event_source_url: event.destination,
          user_data: {
            client_user_agent: event.userAgent,
          },
          custom_data: {
            qr_code_id: event.qrCodeId,
            qr_code_name: event.qrName,
            device: event.device,
            country: event.country,
          },
        },
      ],
    }),
    signal: AbortSignal.timeout(2500),
  });
}

export async function dispatchScanEvents(event: ScanEvent): Promise<void> {
  const [webhooks, integration] = await Promise.all([
    prisma.webhook.findMany({
      where: { userId: event.userId, active: true },
      select: { id: true, url: true, secretEncrypted: true },
    }),
    prisma.integration.findUnique({ where: { userId: event.userId } }),
  ]);

  const jobs: Promise<void>[] = webhooks.map(async (webhook) => {
    try {
      await sendWebhook(webhook.url, webhook.secretEncrypted, event);
    } catch (error) {
      console.error("SCAN_WEBHOOK_ERROR", webhook.id, error);
    }
  });

  if (integration?.gaMeasurementId && integration.gaApiSecretEncrypted) {
    jobs.push(
      sendGoogleAnalytics(integration.gaMeasurementId, integration.gaApiSecretEncrypted, event).catch((error) => {
        console.error("GA4_SCAN_EVENT_ERROR", error);
      }),
    );
  }

  if (integration?.metaPixelId && integration.metaAccessTokenEncrypted) {
    jobs.push(
      sendMeta(integration.metaPixelId, integration.metaAccessTokenEncrypted, event).catch((error) => {
        console.error("META_SCAN_EVENT_ERROR", error);
      }),
    );
  }

  await Promise.allSettled(jobs);
}
