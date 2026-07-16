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
const optionalNavigationUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().refine(
    (value) => value.startsWith("/") || z.string().url().safeParse(value).success,
    "Informe um link relativo ou uma URL válida",
  ).optional(),
);
const optionalHexColor = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor hexadecimal no formato #A3E635").transform((value) => value.toUpperCase()).optional(),
);

export const announcementBarItemSchema = z.object({
  id: z.string().trim().min(1).max(100),
  texto: z.string().trim().min(1, "Informe o texto da mensagem").max(80, "Use no máximo 80 caracteres"),
  link: optionalNavigationUrl,
  ordem: z.number().int().min(0),
  ativo: z.boolean(),
});

export const storeSettingsSchema = z.object({
  nomeLoja: z.string().trim().min(2).max(60),
  descricaoFooter: z.string().trim().min(10).max(160),
  mensagemFooter: z.string().trim().min(5).max(160),
  barraAnuncioAtiva: z.boolean(),
  barraAnuncioTexto: optionalText(120),
  barraAnuncioLink: optionalNavigationUrl,
  barraAnuncioCor: optionalHexColor,
  barraAnuncioVelocidade: z.number().int().min(3, "Use no mínimo 3 segundos").max(30, "Use no máximo 30 segundos"),
  announcementItems: z.array(announcementBarItemSchema).max(10, "Cadastre no máximo 10 mensagens"),
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
  fontFamily: z.enum(["geist", "inter", "poppins", "roboto"]),
  productCardStyle: z.enum(["standard", "compact", "discount"]),
  cardCornerStyle: z.enum(["straight", "rounded"]),
  showRating: z.boolean(),
  showBuyNowButton: z.boolean(),
  buttonStyle: z.enum(["filled", "outline", "pill"]),
}).superRefine((input, context) => {
  if (input.barraAnuncioAtiva && !input.announcementItems.some((item) => item.ativo)) {
    context.addIssue({ code: "custom", path: ["announcementItems"], message: "Ative pelo menos uma mensagem para exibir a barra" });
  }
});

export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
