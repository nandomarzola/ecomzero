import { z } from "zod";

const optionalText = (max: number) => z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().max(max).optional());
const optionalUrl = z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().url("Informe uma URL válida").optional());
const assetUrl = z.string().trim().refine(
  (value) => value.startsWith("/") || z.string().url().safeParse(value).success,
  "Informe uma URL de imagem válida",
);
const optionalAssetUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  assetUrl.optional(),
);

export const storeSettingsSchema = z.object({
  nomeLoja: z.string().trim().min(2).max(60),
  descricaoFooter: z.string().trim().min(10).max(160),
  mensagemFooter: z.string().trim().min(5).max(160),
  barraAnuncioAtiva: z.boolean(),
  barraAnuncioTexto: optionalText(120),
  barraAnuncioLink: optionalUrl,
  emailSuporte: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().email("E-mail inválido").optional()),
  telefoneSuporte: optionalText(30),
  whatsapp: optionalText(30),
  linkShopee: optionalUrl,
  linkInstagram: optionalUrl,
  linkFacebook: optionalUrl,
  linkTiktok: optionalUrl,
  logoUrl: assetUrl,
  faviconUrl: optionalAssetUrl,
  corPrincipal: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor hexadecimal no formato #A3E635").transform((value) => value.toUpperCase()),
  fusoHorario: z.enum(["America/Sao_Paulo", "America/Manaus", "America/Cuiaba", "America/Rio_Branco", "UTC"]),
  lojaAtiva: z.boolean(),
  plano: z.string().trim().min(2).max(40),
  moeda: z.string().trim().min(3).max(8),
  idioma: z.string().trim().min(2).max(12),
}).superRefine((input, context) => {
  if (input.barraAnuncioAtiva && !input.barraAnuncioTexto) context.addIssue({ code: "custom", path: ["barraAnuncioTexto"], message: "Informe o texto da barra de anúncio" });
});

export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
