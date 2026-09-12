import { redirect } from "next/navigation";
import { getAuthClaims } from "@/lib/auth";
import ReportsClient from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const auth = await getAuthClaims();
  if (!auth) redirect("/login");
  return <ReportsClient />;
}
