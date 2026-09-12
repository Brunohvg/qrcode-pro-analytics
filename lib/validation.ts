import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido.")
  .max(255, "E-mail muito longo.");

export const strongPasswordSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(128, "Senha muito longa.")
  .regex(/[a-z]/, "Inclua uma letra minúscula.")
  .regex(/[A-Z]/, "Inclua uma letra maiúscula.")
  .regex(/[0-9]/, "Inclua um número.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha.").max(128),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export const httpUrl = z
  .string()
  .trim()
  .url("Informe uma URL válida.")
  .max(2048, "URL muito longa.")
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "A URL deve começar com http:// ou https://.");

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const optionalUrl = z.union([httpUrl, z.literal(""), z.null()]).optional();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida.");

export const createQrSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome.").max(80, "Nome muito longo."),
  originalUrl: httpUrl,
  campaignId: z.string().cuid().nullable().optional(),
});

export const updateQrSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    originalUrl: httpUrl.optional(),
    campaignId: z.string().cuid().nullable().optional(),
    customDomainId: z.string().cuid().nullable().optional(),
    utmSource: optionalText(100),
    utmMedium: optionalText(100),
    utmCampaign: optionalText(150),
    activeFrom: z.string().max(50).nullable().optional(),
    expiresAt: z.string().max(50).nullable().optional(),
    fallbackUrl: optionalUrl,
    password: z.string().max(128).nullable().optional(),
    passwordPrompt: optionalText(160),
    iosUrl: optionalUrl,
    androidUrl: optionalUrl,
    desktopUrl: optionalUrl,
    countryRules: z.record(z.string().min(2).max(3), httpUrl).nullable().optional(),
    notifyAtScans: z.number().int().positive().max(1_000_000_000).nullable().optional(),
    foregroundColor: color.optional(),
    accentColor: color.optional(),
    frameTitle: optionalText(80),
    frameText: optionalText(180),
    brandName: optionalText(80),
    logoUrl: optionalUrl,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nenhuma alteração informada.",
  });

export const campaignSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).nullable().optional(),
  color: color.default("#34d399"),
});

export const bulkQrSchema = z.object({
  items: z
    .array(z.object({ name: z.string().trim().min(2).max(80), originalUrl: httpUrl }))
    .min(1)
    .max(200),
});

export const customDomainSchema = z.object({
  host: z
    .string()
    .trim()
    .toLowerCase()
    .max(253)
    .regex(/^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/, "Domínio inválido."),
});

export const apiKeySchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const webhookSchema = z.object({
  name: z.string().trim().min(2).max(80),
  url: httpUrl,
  active: z.boolean().optional(),
});

export const integrationSchema = z.object({
  gaMeasurementId: z.string().trim().max(40).nullable().optional(),
  gaApiSecret: z.string().trim().max(255).nullable().optional(),
  metaPixelId: z.string().trim().max(80).nullable().optional(),
  metaAccessToken: z.string().trim().max(1000).nullable().optional(),
});

export const changePlanSchema = z.object({
  planName: z.enum(["Gratuito", "Pro", "Business", "Enterprise"]),
});
