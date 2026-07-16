import { z } from "zod";

// URL de marketplace opcional: string vazia vira undefined; se preenchida,
// precisa ser URL válida.
const marketplaceUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().url("URL inválida").optional(),
);

function parseLocalizedNumber(value: unknown) {
  if (typeof value !== "string") return value;

  const compact = value.trim().replace(/\s+/g, "");
  if (!compact) return undefined;

  const commaIndex = compact.lastIndexOf(",");
  const dotIndex = compact.lastIndexOf(".");
  if (commaIndex >= 0 && dotIndex >= 0) {
    return commaIndex > dotIndex
      ? Number(compact.replace(/\./g, "").replace(",", "."))
      : Number(compact.replace(/,/g, ""));
  }

  return Number(compact.replace(",", "."));
}

const precoField = (label: string) => z.preprocess(
  parseLocalizedNumber,
  z.number({ error: `${label}: informe um valor numérico válido` }).nonnegative(`${label} não pode ser negativo`),
);

const dimField = (label: string) => z.preprocess(
  parseLocalizedNumber,
  z.number({ error: `${label}: informe um valor numérico válido` }).positive(`${label} deve ser maior que zero`),
);

export const variantSchema = z.object({
  // Presente ao editar uma variante existente; ausente ao criar uma nova.
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1, "Informe o rótulo da variante"),
  precoDe: precoField("Preço de"),
  precoPor: precoField("Preço por"),
  skuInterno: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().optional(),
  ),
  pesoKg: dimField("Peso"),
  comprimentoCm: dimField("Comprimento"),
  larguraCm: dimField("Largura"),
  alturaCm: dimField("Altura"),
});

export const productInputSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome"),
  tipo: z.enum(["simples", "variacoes"]),
  categoryId: z.string().uuid("Selecione uma categoria"),
  subtitulo: z.string().trim().min(1, "Informe o subtítulo"),
  descricao: z.string().trim().min(1, "Informe a descrição"),
  ativo: z.boolean().default(true),
  isNovidade: z.boolean().default(false),
  isPromocao: z.boolean().default(false),
  imagem: z.string().trim().min(1, "Envie a imagem de capa"),
  imagens: z.array(z.string().trim().min(1)).default([]),
  linkShopee: marketplaceUrl,
  linkMercadoLivre: marketplaceUrl,
  linkTiktokShop: marketplaceUrl,
  linkShein: marketplaceUrl,
  variantes: z.array(variantSchema).min(1, "Informe os dados de venda do produto"),
}).superRefine((input, context) => {
  if (input.tipo === "simples" && input.variantes.length !== 1) {
    context.addIssue({ code: "custom", path: ["variantes"], message: "Produto simples deve ter uma única configuração de venda" });
  }
  if (input.tipo === "variacoes" && input.variantes.length < 2) {
    context.addIssue({ code: "custom", path: ["variantes"], message: "Cadastre pelo menos duas variações" });
  }
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type VariantInput = z.infer<typeof variantSchema>;
