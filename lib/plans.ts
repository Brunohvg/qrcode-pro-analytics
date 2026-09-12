import type { Plan } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type PlanCapability =
  | "dynamicLinks"
  | "customBranding"
  | "campaigns"
  | "scheduledLinks"
  | "passwordProtection"
  | "reports"
  | "bulkGeneration"
  | "smartRedirect"
  | "customDomains"
  | "integrations"
  | "apiAccess"
  | "webhooks";

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
    create: {
      id: "plan_free",
      name: "Gratuito",
      qrLimit: 3,
      dynamicLinks: true,
      price: "0.00",
      analyticsDays: 7,
    },
  });

  return prisma.subscription.create({
    data: { userId, planId: freePlan.id, status: "ACTIVE" },
    include: { plan: true },
  });
}

export async function getActiveSubscription(userId: string) {
  return ensureFreeSubscription(userId);
}

export function hasCapability(plan: Plan, capability: PlanCapability): boolean {
  return Boolean(plan[capability]);
}

export function isAdvancedPlan(name: string): boolean {
  return name === "Pro" || name === "Business" || name === "Enterprise";
}

export function isBusinessPlan(name: string): boolean {
  return name === "Business" || name === "Enterprise";
}
