import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import type { MetaCatalogReport, MetaCatalogAdminSettings } from "@/types/metaCatalog";
import type { MetaCatalogSettingsInput } from "@/lib/validation/metaCatalog";

const storefrontUrl = (
  config.storefrontUrl ??
  (config.nodeEnv === "production" ? "https://www.ecomzero.com.br" : "http://localhost:3000")
).replace(/\/$/, "");

export async function getMetaCatalogSettings(): Promise<MetaCatalogAdminSettings> {
  const settings = await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
    select: {
      metaCatalogFeedAtivo: true,
      metaCatalogIncludeOutOfStock: true,
      metaCatalogIncludeSalePrice: true,
      metaCatalogIncludeImages: true,
      metaCatalogDefaultBrand: true,
      metaCatalogDefaultCategory: true,
      metaCatalogLastValidatedAt: true,
    },
  });

  return {
    feedActive: settings.metaCatalogFeedAtivo,
    includeOutOfStock: settings.metaCatalogIncludeOutOfStock,
    includeSalePrice: settings.metaCatalogIncludeSalePrice,
    includeAdditionalImages: settings.metaCatalogIncludeImages,
    defaultBrand: settings.metaCatalogDefaultBrand,
    defaultCategory: settings.metaCatalogDefaultCategory,
    lastValidatedAt: settings.metaCatalogLastValidatedAt?.toISOString() ?? null,
  };
}

export async function updateMetaCatalogSettings(input: MetaCatalogSettingsInput) {
  return prisma.storeSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      metaCatalogFeedAtivo: input.feedActive,
      metaCatalogIncludeOutOfStock: input.includeOutOfStock,
      metaCatalogIncludeSalePrice: input.includeSalePrice,
      metaCatalogIncludeImages: input.includeAdditionalImages,
      metaCatalogDefaultBrand: input.defaultBrand,
      metaCatalogDefaultCategory: input.defaultCategory,
    },
    update: {
      metaCatalogFeedAtivo: input.feedActive,
      metaCatalogIncludeOutOfStock: input.includeOutOfStock,
      metaCatalogIncludeSalePrice: input.includeSalePrice,
      metaCatalogIncludeImages: input.includeAdditionalImages,
      metaCatalogDefaultBrand: input.defaultBrand,
      metaCatalogDefaultCategory: input.defaultCategory,
    },
  });
}

export async function markMetaCatalogValidated() {
  return prisma.storeSettings.update({
    where: { id: "singleton" },
    data: { metaCatalogLastValidatedAt: new Date() },
  });
}

export async function fetchMetaCatalogReport(): Promise<
  { ok: true; report: MetaCatalogReport } | { ok: false; error: string }
> {
  if (!config.storefrontSyncApiKey) {
    return { ok: false, error: "STOREFRONT_SYNC_API_KEY não está configurada no admin." };
  }

  try {
    const response = await fetch(`${storefrontUrl}/api/admin/meta-catalog`, {
      headers: { Authorization: `Bearer ${config.storefrontSyncApiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await response.json().catch(() => null)) as MetaCatalogReport | { error?: string } | null;
    if (!response.ok || !data || !("items" in data)) {
      return {
        ok: false,
        error: data && "error" in data && data.error ? data.error : `Storefront respondeu HTTP ${response.status}.`,
      };
    }
    return { ok: true, report: data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Não foi possível consultar o storefront.",
    };
  }
}

export function getMetaCatalogFeedUrl() {
  return `${storefrontUrl}/api/integracoes/meta/catalogo.xml`;
}
