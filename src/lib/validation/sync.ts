import { z } from "zod";

// Payload que o admin do Hub (projeto-ecomzero-hub) envia via POST
// /api/admin/sync-catalog. O Hub só tem nome/categoria/preço/link Shopee —
// campos de vitrine que ele não tem (subtitulo/descricao/imagens/
// caracteristicas) chegam vazios/com fallback e são completados depois
// direto no ecomzero.
const syncVariantSchema = z.object({
  label: z.string().min(1),
  precoDe: z.number().nonnegative(),
  precoPor: z.number().nonnegative(),
  linkShopee: z.string().nullable().optional(),
  skuInterno: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(100).transform((value) => value.toUpperCase()).nullable().optional(),
  ),
});

const syncProductSchema = z.object({
  slug: z.string().min(1),
  categoria: z.string().min(1),
  nome: z.string().min(1),
  subtitulo: z.string(),
  descricao: z.string(),
  imagem: z.string(),
  imagens: z.array(z.string()),
  caracteristicas: z.array(z.string()),
  linkShopee: z.string(),
  ativo: z.boolean(),
  variantes: z.array(syncVariantSchema).min(1),
});

export const syncCatalogPayloadSchema = z.object({
  produtos: z.array(syncProductSchema).min(1),
});

export type SyncProductInput = z.infer<typeof syncProductSchema>;
export type SyncCatalogPayload = z.infer<typeof syncCatalogPayloadSchema>;
