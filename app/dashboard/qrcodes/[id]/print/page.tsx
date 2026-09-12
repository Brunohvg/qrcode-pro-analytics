import { notFound, redirect } from "next/navigation";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import PrintQrClient from "./print-client";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function PrintQrPage({ params }: PageProps) {
  const auth = await getAuthClaims();
  if (!auth) redirect("/login");

  const { id } = await params;
  const [item, subscription] = await Promise.all([
    prisma.qRCode.findFirst({
      where: { id, userId: auth.userId },
      select: {
        id: true,
        name: true,
        originalUrl: true,
        slug: true,
        scanCount: true,
        foregroundColor: true,
        accentColor: true,
        frameTitle: true,
        frameText: true,
        brandName: true,
        logoUrl: true,
      },
    }),
    getActiveSubscription(auth.userId),
  ]);

  if (!item) notFound();
  return <PrintQrClient item={item} brandingEnabled={subscription.plan.customBranding} />;
}
