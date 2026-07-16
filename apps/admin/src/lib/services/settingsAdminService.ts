import { prisma } from "@/lib/db";
import type { StoreSettingsInput } from "@/lib/validation/settings";

const defaults = {
  id: "singleton", nomeLoja: "EcomZero", descricaoFooter: "Produtos inteligentes, úteis e de qualidade para transformar sua rotina.",
  mensagemFooter: "Produtos úteis para facilitar o seu dia a dia.", barraAnuncioAtiva: false,
  logoUrl: "/images/logo2.png", corPrincipal: "#A9EC17", fusoHorario: "America/Sao_Paulo",
  lojaAtiva: true, plano: "Profissional", moeda: "BRL", idioma: "pt-BR",
  fontFamily: "geist", productCardStyle: "standard", cardCornerStyle: "rounded",
  showRating: true, showBuyNowButton: true, buttonStyle: "filled",
};

export async function getStoreSettings() {
  return prisma.storeSettings.upsert({ where: { id: "singleton" }, create: defaults, update: {} });
}

export async function updateStoreSettings(input: StoreSettingsInput) {
  const data = {
    ...input,
    barraAnuncioTexto: input.barraAnuncioTexto ?? null,
    barraAnuncioLink: input.barraAnuncioLink ?? null,
    emailSuporte: input.emailSuporte ?? null,
    telefoneSuporte: input.telefoneSuporte ?? null,
    whatsapp: input.whatsapp ?? null,
    linkShopee: input.linkShopee ?? null,
    linkInstagram: input.linkInstagram ?? null,
    linkFacebook: input.linkFacebook ?? null,
    linkTiktok: input.linkTiktok ?? null,
    faviconUrl: input.faviconUrl ?? null,
  };
  return prisma.storeSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", ...data }, update: data });
}
