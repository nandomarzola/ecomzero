import { z } from "zod";

// Valida slug vindo de params de rota (entrada externa: URL do usuário)
export const productSlugSchema = z
  .string()
  .trim()
  .min(1, "slug obrigatório")
  .max(200, "slug muito longo")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug em formato inválido");

export type ProductSlugInput = z.infer<typeof productSlugSchema>;
