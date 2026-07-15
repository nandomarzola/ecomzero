import { z } from "zod";

const optionalId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().uuid("Categoria pai inválida").optional(),
);

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(500, "Descrição muito longa").optional(),
);

const optionalImageUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().url("URL da imagem inválida").max(2048, "URL da imagem muito longa").optional(),
);

const optionalMetaTitle = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(70, "O meta título deve ter no máximo 70 caracteres").optional(),
);

const optionalMetaDescription = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(170, "A meta descrição deve ter no máximo 170 caracteres").optional(),
);

export const categoryInputSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da categoria").max(80, "Nome muito longo"),
  descricao: optionalText,
  imagemUrl: optionalImageUrl,
  destaque: z.boolean().default(false),
  metaTitulo: optionalMetaTitle,
  metaDescricao: optionalMetaDescription,
  parentId: optionalId,
  ativo: z.boolean().default(true),
});

export const categoryReorderSchema = z.object({
  parentId: optionalId,
  orderedIds: z.array(z.string().uuid("Categoria inválida")).min(1, "Informe as categorias a reordenar"),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type CategoryReorderInput = z.infer<typeof categoryReorderSchema>;
