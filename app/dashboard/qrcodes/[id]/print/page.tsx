import { notFound, redirect } from "next/navigation";
import { getAuthClaims } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PrintQrClient from "./print-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function PrintQrPage({ params }: PageProps) {
  const auth = await getAuthClaims();
  if (!auth) redirect("/login");

  const { id } = await params;
  const item = await prisma.qRCode.findFirst({
    where: { id, userId: auth.userId },
    select: {
      id: true,
      name: true,
      originalUrl: true,
      slug: true,
      scanCount: true,
    },
  });

  if (!item) notFound();

  return <PrintQrClient item={item} />;
}
