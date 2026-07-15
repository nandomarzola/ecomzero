import { z } from "zod";
import { bannerSpecs } from "@/lib/bannerSpecs";

const optionalUrl = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.string().url("Informe uma URL válida").optional(),
);
const optionalDate = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.date().optional(),
);

export const bannerInputSchema = z.object({
  nome: z.string().trim().min(2, "Informe um nome interno").max(80),
  imagemUrl: z.string().url("Envie a imagem do banner"),
  altText: z.string().trim().min(3, "Descreva a imagem para acessibilidade").max(160),
  linkUrl: optionalUrl,
  posicao: z.enum(["hero_slide", "home_middle", "home_bottom"]),
  largura: z.coerce.number().int().positive(),
  altura: z.coerce.number().int().positive(),
  ordem: z.coerce.number().int().min(0),
  ativo: z.boolean(),
  inicioEm: optionalDate,
  expiraEm: optionalDate,
}).superRefine((input, context) => {
  const spec = bannerSpecs[input.posicao];
  if (input.largura !== spec.width || input.altura !== spec.height) context.addIssue({ code: "custom", path: ["imagemUrl"], message: `A imagem precisa ter exatamente ${spec.width} × ${spec.height}px` });
  if (input.inicioEm && input.expiraEm && input.expiraEm <= input.inicioEm) context.addIssue({ code: "custom", path: ["expiraEm"], message: "A expiração precisa ser posterior ao início" });
});

export type BannerInput = z.infer<typeof bannerInputSchema>;
