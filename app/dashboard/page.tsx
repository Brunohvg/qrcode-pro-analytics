import { redirect } from "next/navigation";
import { getAuthClaims } from "@/lib/auth";
import DashboardClient from "./dashboard-client";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function DashboardPage({ searchParams }: Props) {
  const auth = await getAuthClaims();
  if (!auth) redirect("/login");
  const query = await searchParams;
  return (
    <DashboardClient
      email={auth.email}
      initialName={first(query.name).slice(0, 80)}
      initialUrl={first(query.url).slice(0, 2048)}
      initialCampaignId={first(query.campaign)}
    />
  );
}
