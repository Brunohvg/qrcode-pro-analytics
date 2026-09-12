import { redirect } from "next/navigation";
import { getAuthClaims } from "@/lib/auth";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const auth = await getAuthClaims();
  if (!auth) redirect("/login");
  return <DashboardClient email={auth.email} />;
}
