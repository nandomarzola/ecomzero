import { z } from "zod";

// URL de marketplace opcional: string vazia vira undefined; se preenchida,
// precisa ser URL válida.
const marketplaceUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().url("URL inválida").optional(),
);

const precoField = z.coerce.number().nonnegative("Preço não pode ser negativo");
const dimField = z.coerce.number().positive("Precisa ser maior que zero");

export const variantSchema = z.object({
  // Presente ao editar uma variante existente; ausente ao criar uma nova.
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1, "Informe o rótulo da variante"),
  precoDe: precoField,
  precoPor: precoField,
  skuInterno: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().optional(),
  ),
  linkShopee: marketplaceUrl,
  pesoKg: dimField,
  comprimentoCm: dimField,
  larguraCm: dimField,
  alturaCm: dimField,
});

export const productInputSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome"),
  categoria: z.string().trim().min(1, "Informe a categoria"),
  subtitulo: z.string().trim().min(1, "Informe o subtítulo"),
  descricao: z.string().trim().min(1, "Informe a descrição"),
  ativo: z.boolean().default(true),
  imagem: z.string().trim().min(1, "Envie a imagem de capa"),
  imagens: z.array(z.string().trim().min(1)).default([]),
  linkMercadoLivre: marketplaceUrl,
  linkTiktokShop: marketplaceUrl,
  linkShein: marketplaceUrl,
  variantes: z.array(variantSchema).min(1, "Cadastre ao menos uma variante"),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type VariantInput = z.infer<typeof variantSchema>;
