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

const httpUrl = z
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

export const createQrSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome.").max(80, "Nome muito longo."),
  originalUrl: httpUrl,
});

export const updateQrSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  originalUrl: httpUrl.optional(),
}).refine((data) => data.name !== undefined || data.originalUrl !== undefined, {
  message: "Nenhuma alteração informada.",
});

export const changePlanSchema = z.object({
  planName: z.enum(["Gratuito", "Pro", "Enterprise"]),
});
