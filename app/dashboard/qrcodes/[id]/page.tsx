import { redirect } from "next/navigation";
import { getAuthClaims } from "@/lib/auth";
import AdvancedQrClient from "./advanced-qr-client";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function AdvancedQrPage({ params }: Props) {
  const auth = await getAuthClaims();
  if (!auth) redirect("/login");
  const { id } = await params;
  return <AdvancedQrClient id={id} />;
}
