import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não configurada.");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const plans = [
  {
    id: "plan_free",
    name: "Gratuito",
    qrLimit: 3,
    dynamicLinks: true,
    price: "0.00",
    analyticsDays: 7,
    customBranding: false,
    campaigns: false,
    scheduledLinks: false,
    passwordProtection: false,
    reports: false,
    bulkGeneration: false,
    smartRedirect: false,
    customDomains: false,
    integrations: false,
    apiAccess: false,
    webhooks: false,
    teamSeats: 1,
  },
  {
    id: "plan_pro",
    name: "Pro",
    qrLimit: 30,
    dynamicLinks: true,
    price: "69.90",
    analyticsDays: 90,
    customBranding: true,
    campaigns: true,
    scheduledLinks: true,
    passwordProtection: true,
    reports: true,
    bulkGeneration: false,
    smartRedirect: false,
    customDomains: false,
    integrations: false,
    apiAccess: false,
    webhooks: false,
    teamSeats: 1,
  },
  {
    id: "plan_business",
    name: "Business",
    qrLimit: 200,
    dynamicLinks: true,
    price: "149.90",
    analyticsDays: 365,
    customBranding: true,
    campaigns: true,
    scheduledLinks: true,
    passwordProtection: true,
    reports: true,
    bulkGeneration: true,
    smartRedirect: true,
    customDomains: true,
    integrations: true,
    apiAccess: true,
    webhooks: true,
    teamSeats: 3,
  },
  {
    id: "plan_enterprise",
    name: "Enterprise",
    qrLimit: -1,
    dynamicLinks: true,
    price: "0.00",
    analyticsDays: -1,
    customBranding: true,
    campaigns: true,
    scheduledLinks: true,
    passwordProtection: true,
    reports: true,
    bulkGeneration: true,
    smartRedirect: true,
    customDomains: true,
    integrations: true,
    apiAccess: true,
    webhooks: true,
    teamSeats: 10,
  },
] as const;

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
