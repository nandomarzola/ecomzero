import { z } from "zod";

const optionalText = (max: number) => z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().max(max).optional());
const optionalUrl = z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().url("Informe uma URL válida").optional());

export const storeSettingsSchema = z.object({
  nomeLoja: z.string().trim().min(2).max(60),
  descricaoFooter: z.string().trim().min(10).max(240),
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
}).superRefine((input, context) => {
  if (input.barraAnuncioAtiva && !input.barraAnuncioTexto) context.addIssue({ code: "custom", path: ["barraAnuncioTexto"], message: "Informe o texto da barra de anúncio" });
});

export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
