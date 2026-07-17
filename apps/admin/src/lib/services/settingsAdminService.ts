import { prisma } from "@/lib/db";
import { normalizeBusinessHours, normalizeFooterColumns } from "@/lib/settingsConfigDomain";
import type { StoreSettingsInput } from "@/lib/validation/settings";

const defaults = {
  id: "singleton", nomeLoja: "EcomZero", descricaoFooter: "Produtos inteligentes, úteis e de qualidade para transformar sua rotina.",
  mensagemFooter: "Produtos úteis para facilitar o seu dia a dia.", barraAnuncioAtiva: false,
  barraAnuncioVelocidade: 5,
  logoUrl: "/images/logo2.png", corPrincipal: "#A9EC17", fusoHorario: "America/Sao_Paulo",
  lojaAtiva: true, plano: "Profissional", moeda: "BRL", idioma: "pt-BR",
  fontFamily: "geist", productCardStyle: "standard", cardCornerStyle: "rounded",
  showRating: true, showBuyNowButton: true, buttonStyle: "filled",
};

export async function getStoreSettings() {
  const settings = await prisma.storeSettings.upsert({ where: { id: "singleton" }, create: defaults, update: {} });
  return {
    ...settings,
    horariosAtendimento: normalizeBusinessHours(settings.horariosAtendimento),
    footerColumns: normalizeFooterColumns(settings.footerColumns),
    valorMinimoPedido: Number(settings.valorMinimoPedido),
  };
}

export async function getAnnouncementBarItems() {
  return prisma.announcementBarItem.findMany({
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      texto: true,
      link: true,
      ordem: true,
      ativo: true,
      couponId: true,
      regioesElegiveis: true,
    },
  });
}

export async function updateStoreSettings(input: StoreSettingsInput) {
  const { announcementItems, horariosAtendimento, footerColumns, ...settingsInput } = input;
  const firstActiveItem = announcementItems.find((item) => item.ativo);
  const data = {
    ...settingsInput,
    horariosAtendimento,
    footerColumns,
    barraAnuncioTexto: firstActiveItem?.texto ?? null,
    barraAnuncioLink: firstActiveItem?.link ?? null,
    barraAnuncioCor: settingsInput.barraAnuncioCor ?? null,
    emailSuporte: settingsInput.emailSuporte ?? null,
    telefoneSuporte: settingsInput.telefoneSuporte ?? null,
    whatsapp: settingsInput.whatsapp ?? null,
    linkShopee: settingsInput.linkShopee ?? null,
    linkInstagram: settingsInput.linkInstagram ?? null,
    linkFacebook: settingsInput.linkFacebook ?? null,
    linkTiktok: settingsInput.linkTiktok ?? null,
    linkYoutube: settingsInput.linkYoutube ?? null,
    linkTwitter: settingsInput.linkTwitter ?? null,
    linkMercadoLivre: settingsInput.linkMercadoLivre ?? null,
    linkTiktokShop: settingsInput.linkTiktokShop ?? null,
    linkShein: settingsInput.linkShein ?? null,
    razaoSocial: settingsInput.razaoSocial ?? null,
    cnpjLoja: settingsInput.cnpjLoja ?? null,
    enderecoEmpresa: settingsInput.enderecoEmpresa ?? null,
    metaPixelId: settingsInput.metaPixelId ?? null,
    googleAnalyticsId: settingsInput.googleAnalyticsId ?? null,
    googleTagManagerId: settingsInput.googleTagManagerId ?? null,
    tiktokPixelId: settingsInput.tiktokPixelId ?? null,
    customHeadCode: settingsInput.customHeadCode ?? null,
    faviconUrl: settingsInput.faviconUrl ?? null,
  };
  return prisma.$transaction(async (transaction) => {
    const settings = await transaction.storeSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", ...data }, update: data });
    const ids = announcementItems.map((item) => item.id);
    await transaction.announcementBarItem.deleteMany(ids.length ? { where: { id: { notIn: ids } } } : undefined);
    for (const [index, item] of announcementItems.entries()) {
      const itemData = {
        texto: item.texto,
        link: item.link ?? null,
        ordem: index,
        ativo: item.ativo,
        couponId: item.couponId ?? null,
        regioesElegiveis: item.regioesElegiveis,
      };
      await transaction.announcementBarItem.upsert({ where: { id: item.id }, create: { id: item.id, ...itemData }, update: itemData });
    }
    return settings;
  });
}
