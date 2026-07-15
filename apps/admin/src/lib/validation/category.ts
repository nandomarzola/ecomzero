import { z } from "zod";

const optionalId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().uuid("Categoria pai inválida").optional(),
);

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(500, "Descrição muito longa").optional(),
);

export const categoryInputSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da categoria").max(80, "Nome muito longo"),
  descricao: optionalText,
  parentId: optionalId,
  ordem: z.coerce.number().int().min(0, "A ordem não pode ser negativa").default(0),
  ativo: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
