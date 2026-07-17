import { z } from "zod";
import { BRAZIL_UFS } from "@/lib/brazilStates";

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

const footerLinkSchema = z.object({
  id: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1, "Informe o nome do link").max(40),
  href: z.string().trim().refine(
    (value) => value.startsWith("/") || z.string().url().safeParse(value).success,
    "Informe um link relativo ou uma URL válida",
  ),
  ativo: z.boolean(),
  novaAba: z.boolean(),
});

const footerColumnSchema = z.object({
  id: z.string().trim().min(1).max(100),
  titulo: z.string().trim().min(1, "Informe o título da coluna").max(30),
  tipo: z.enum(["links", "categorias"]),
  ativo: z.boolean(),
  links: z.array(footerLinkSchema).max(10),
});

const businessHourSchema = z.object({
  dia: z.enum(["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"]),
  label: z.string().trim().min(1).max(30),
  ativo: z.boolean(),
  inicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inicial inválido"),
  fim: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário final inválido"),
});

const messageTemplate = z.string().trim().min(5).max(300);

export const announcementBarItemSchema = z.object({
  id: z.string().trim().min(1).max(100),
  texto: z.string().trim().min(1, "Informe o texto da mensagem").max(80, "Use no máximo 80 caracteres"),
  link: optionalNavigationUrl,
  ordem: z.number().int().min(0),
  ativo: z.boolean(),
  couponId: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().uuid("Selecione um cupom válido").optional(),
  ),
  regioesElegiveis: z
    .array(z.enum(BRAZIL_UFS))
    .max(BRAZIL_UFS.length)
    .default([])
    .transform((ufs) => [...new Set(ufs)]),
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
  linkYoutube: optionalUrl,
  linkTwitter: optionalUrl,
  instagramAtivo: z.boolean(),
  facebookAtivo: z.boolean(),
  tiktokAtivo: z.boolean(),
  youtubeAtivo: z.boolean(),
  twitterAtivo: z.boolean(),
  shopeeAtivo: z.boolean(),
  linkMercadoLivre: optionalUrl,
  mercadoLivreAtivo: z.boolean(),
  linkTiktokShop: optionalUrl,
  tiktokShopAtivo: z.boolean(),
  linkShein: optionalUrl,
  sheinAtivo: z.boolean(),
  emailSuporteAtivo: z.boolean(),
  telefoneSuporteAtivo: z.boolean(),
  whatsappAtivo: z.boolean(),
  whatsappMensagem: z.string().trim().min(5).max(200),
  horariosAtendimento: z.array(businessHourSchema).length(7),
  footerColumns: z.array(footerColumnSchema).min(1).max(5),
  footerSeloSeguranca: z.boolean(),
  footerCopyrightTexto: z.string().trim().min(3).max(120),
  footerCopyrightAno: z.enum(["automatico", "fixo"]),
  footerCopyrightAnoFixo: z.number().int().min(2000).max(2200).nullable(),
  razaoSocial: optionalText(100),
  cnpjLoja: optionalText(18),
  enderecoEmpresa: optionalText(180),
  mensagemBoasVindasAtiva: z.boolean(),
  mensagemBoasVindas: messageTemplate,
  mensagemPedidoConfirmadoAtiva: z.boolean(),
  mensagemPedidoConfirmado: messageTemplate,
  mensagemPedidoEnviadoAtiva: z.boolean(),
  mensagemPedidoEnviado: messageTemplate,
  mensagemPedidoEntregueAtiva: z.boolean(),
  mensagemPedidoEntregue: messageTemplate,
  metaPixelAtivo: z.boolean(),
  metaPixelId: optionalText(30),
  googleAnalyticsAtivo: z.boolean(),
  googleAnalyticsId: optionalText(30),
  googleTagManagerAtivo: z.boolean(),
  googleTagManagerId: optionalText(30),
  tiktokPixelAtivo: z.boolean(),
  tiktokPixelId: optionalText(40),
  customHeadCodeAtivo: z.boolean(),
  customHeadCode: optionalText(12000),
  modoManutencao: z.boolean(),
  mensagemManutencao: z.string().trim().min(10).max(240),
  valorMinimoPedido: z.number().min(0).max(100000),
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
  const requireValue = (enabled: boolean, value: string | undefined, path: string, message: string) => {
    if (enabled && !value) context.addIssue({ code: "custom", path: [path], message });
  };
  requireValue(input.emailSuporteAtivo, input.emailSuporte, "emailSuporte", "Informe o e-mail de atendimento");
  requireValue(input.telefoneSuporteAtivo, input.telefoneSuporte, "telefoneSuporte", "Informe o telefone de atendimento");
  requireValue(input.whatsappAtivo, input.whatsapp, "whatsapp", "Informe o número do WhatsApp");
  requireValue(input.instagramAtivo, input.linkInstagram, "linkInstagram", "Informe a URL do Instagram");
  requireValue(input.facebookAtivo, input.linkFacebook, "linkFacebook", "Informe a URL do Facebook");
  requireValue(input.tiktokAtivo, input.linkTiktok, "linkTiktok", "Informe a URL do TikTok");
  requireValue(input.youtubeAtivo, input.linkYoutube, "linkYoutube", "Informe a URL do YouTube");
  requireValue(input.twitterAtivo, input.linkTwitter, "linkTwitter", "Informe a URL do X/Twitter");
  requireValue(input.shopeeAtivo, input.linkShopee, "linkShopee", "Informe a URL da Shopee");
  requireValue(input.mercadoLivreAtivo, input.linkMercadoLivre, "linkMercadoLivre", "Informe a URL do Mercado Livre");
  requireValue(input.tiktokShopAtivo, input.linkTiktokShop, "linkTiktokShop", "Informe a URL do TikTok Shop");
  requireValue(input.sheinAtivo, input.linkShein, "linkShein", "Informe a URL da Shein");
  if (input.footerCopyrightAno === "fixo" && input.footerCopyrightAnoFixo === null) {
    context.addIssue({ code: "custom", path: ["footerCopyrightAnoFixo"], message: "Informe o ano fixo" });
  }
  if (input.cnpjLoja && input.cnpjLoja.replace(/\D/g, "").length !== 14) {
    context.addIssue({ code: "custom", path: ["cnpjLoja"], message: "Informe um CNPJ com 14 dígitos" });
  }
  for (const schedule of input.horariosAtendimento) {
    if (schedule.ativo && schedule.inicio >= schedule.fim) {
      context.addIssue({ code: "custom", path: ["horariosAtendimento"], message: `${schedule.label}: o horário final deve ser posterior ao inicial` });
    }
  }
  requireValue(input.metaPixelAtivo, input.metaPixelId, "metaPixelId", "Informe o Meta Pixel ID");
  requireValue(input.googleAnalyticsAtivo, input.googleAnalyticsId, "googleAnalyticsId", "Informe o Google Analytics ID");
  requireValue(input.googleTagManagerAtivo, input.googleTagManagerId, "googleTagManagerId", "Informe o Google Tag Manager ID");
  requireValue(input.tiktokPixelAtivo, input.tiktokPixelId, "tiktokPixelId", "Informe o TikTok Pixel ID");
  requireValue(input.customHeadCodeAtivo, input.customHeadCode, "customHeadCode", "Informe o código JavaScript personalizado");
  if (input.metaPixelId && !/^\d{5,30}$/.test(input.metaPixelId)) {
    context.addIssue({ code: "custom", path: ["metaPixelId"], message: "Meta Pixel ID inválido" });
  }
  if (input.googleAnalyticsId && !/^(G|UA)-[A-Z0-9-]+$/i.test(input.googleAnalyticsId)) {
    context.addIssue({ code: "custom", path: ["googleAnalyticsId"], message: "Google Analytics ID inválido" });
  }
  if (input.googleTagManagerId && !/^GTM-[A-Z0-9]+$/i.test(input.googleTagManagerId)) {
    context.addIssue({ code: "custom", path: ["googleTagManagerId"], message: "Google Tag Manager ID inválido" });
  }
  if (input.tiktokPixelId && !/^[A-Z0-9]{8,40}$/i.test(input.tiktokPixelId)) {
    context.addIssue({ code: "custom", path: ["tiktokPixelId"], message: "TikTok Pixel ID inválido" });
  }
  if (input.customHeadCode && /<\/?script\b/i.test(input.customHeadCode)) {
    context.addIssue({ code: "custom", path: ["customHeadCode"], message: "Cole apenas o conteúdo JavaScript, sem as tags <script>" });
  }
});

export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
