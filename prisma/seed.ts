import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não configurada.");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const plans = [
    { id: "plan_free", name: "Gratuito", qrLimit: 3, dynamicLinks: true, price: "0.00" },
    { id: "plan_pro", name: "Pro", qrLimit: -1, dynamicLinks: true, price: "29.00" },
    { id: "plan_enterprise", name: "Enterprise", qrLimit: -1, dynamicLinks: true, price: "99.00" },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {
        qrLimit: plan.qrLimit,
        dynamicLinks: plan.dynamicLinks,
        price: plan.price,
      },
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
