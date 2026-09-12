import { redirect } from "next/navigation";
import { getAuthClaims } from "@/lib/auth";
import BillingClient from "./billing-client";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; checkout?: string }>;
}) {
  const auth = await getAuthClaims();
  if (!auth) redirect("/login");
  const params = await searchParams;
  return <BillingClient initialPlan={params.plan === "Business" ? "Business" : params.plan === "Pro" ? "Pro" : undefined} checkoutReturn={params.checkout === "retorno"} />;
}
