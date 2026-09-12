import { redirect } from "next/navigation";
import { getAuthClaims } from "@/lib/auth";
import AnalyticsClient from "./analytics-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };
export default async function AnalyticsPage({ params }: Props) {
  const auth = await getAuthClaims();
  if (!auth) redirect("/login");
  const { id } = await params;
  return <AnalyticsClient id={id} />;
}
