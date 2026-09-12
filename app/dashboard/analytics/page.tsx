import { redirect } from "next/navigation";
import { getAuthClaims } from "@/lib/auth";
import AnalyticsOverviewClient from "./overview-client";

export const dynamic = "force-dynamic";

export default async function AnalyticsOverviewPage() {
  const auth = await getAuthClaims();
  if (!auth) redirect("/login");
  return <AnalyticsOverviewClient />;
}
