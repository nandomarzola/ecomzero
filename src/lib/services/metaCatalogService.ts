import { prisma } from "@/lib/db";
import { XMLValidator } from "fast-xml-parser";
import {
  buildMetaCatalogReport,
  buildMetaCatalogXml,
  createMetaCatalogFeedResponse,
  type MetaCatalogProductInput,
  type MetaCatalogReport,
} from "@/lib/metaCatalogDomain";

export async function getMetaCatalogReport(): Promise<MetaCatalogReport> {
  const [settings, products] = await Promise.all([
    prisma.storeSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
      select: {
        nomeLoja: true,
        metaCatalogFeedAtivo: true,
        metaCatalogIncludeOutOfStock: true,
        metaCatalogIncludeSalePrice: true,
        metaCatalogIncludeImages: true,
        metaCatalogDefaultBrand: true,
        metaCatalogDefaultCategory: true,
        metaCatalogLastValidatedAt: true,
      },
    }),
    prisma.product.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        slug: true,
        nome: true,
        descricao: true,
        imagem: true,
        imagens: true,
        ativo: true,
        tipo: true,
        categoria: true,
        category: {
          select: {
            slug: true,
          },
        },
        variantes: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            label: true,
            skuInterno: true,
            precoDe: true,
            precoPor: true,
          },
        },
      },
    }),
  ]);

  const catalogProducts: MetaCatalogProductInput[] = products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.nome,
    description: product.descricao,
    image: product.imagem,
    additionalImages: product.imagens,
    active: product.ativo,
    kind: product.tipo,
    category: product.categoria,
    categorySlug: product.category?.slug ?? null,
    variants: product.variantes.map((variant) => ({
      id: variant.id,
      label: variant.label,
      sku: variant.skuInterno,
      priceFrom: Number(variant.precoDe),
      priceFor: Number(variant.precoPor),
      stockQuantity: null,
    })),
  }));

  const report = buildMetaCatalogReport(catalogProducts, {
    feedActive: settings.metaCatalogFeedAtivo,
    includeOutOfStock: settings.metaCatalogIncludeOutOfStock,
    includeSalePrice: settings.metaCatalogIncludeSalePrice,
    includeAdditionalImages: settings.metaCatalogIncludeImages,
    defaultBrand: settings.metaCatalogDefaultBrand,
    defaultCategory: settings.metaCatalogDefaultCategory,
    storeName: settings.nomeLoja,
    lastValidatedAt: settings.metaCatalogLastValidatedAt?.toISOString() ?? null,
  });
  const validation = XMLValidator.validate(buildMetaCatalogXml(report));
  if (validation === true) return report;

  const xmlIssue = {
    id: "catalog:xml:invalid",
    productId: "",
    productSlug: "",
    productName: "Catálogo XML",
    variantId: null,
    field: "XML",
    reason: validation.err.msg,
    recommendation: "Revise a geração do feed antes de disponibilizá-lo à Meta.",
    severity: "error" as const,
  };
  return {
    ...report,
    xmlValid: false,
    metrics: { ...report.metrics, errors: report.metrics.errors + 1 },
    problems: [xmlIssue, ...report.problems],
  };
}

export async function getMetaCatalogFeedResponse(request: Request): Promise<Response> {
  const report = await getMetaCatalogReport();
  const download = new URL(request.url).searchParams.get("download") === "1";
  return createMetaCatalogFeedResponse(report, { download });
}
