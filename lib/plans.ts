import { prisma } from "@/lib/prisma";

export async function ensureFreeSubscription(userId: string) {
  const current = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
  if (current) return current;

  const freePlan = await prisma.plan.upsert({
    where: { name: "Gratuito" },
    update: {},
    create: { id: "plan_free", name: "Gratuito", qrLimit: 3, dynamicLinks: true, price: "0.00" },
  });

  return prisma.subscription.create({
    data: { userId, planId: freePlan.id, status: "ACTIVE" },
    include: { plan: true },
  });
}

export async function getActiveSubscription(userId: string) {
  return ensureFreeSubscription(userId);
}

export function isAdvancedPlan(name: string): boolean {
  return name === "Pro" || name === "Enterprise";
}
