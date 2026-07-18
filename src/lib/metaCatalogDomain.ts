import { metaCatalogContentId } from "@/lib/metaCatalogIds";

export const META_CATALOG_SITE_URL = "https://www.ecomzero.com.br";
export const META_CATALOG_FEED_PATH = "/api/integracoes/meta/catalogo.xml";

export type MetaCatalogSettings = {
  feedActive: boolean;
  includeOutOfStock: boolean;
  includeSalePrice: boolean;
  includeAdditionalImages: boolean;
  defaultBrand: string;
  defaultCategory: string;
  storeName: string;
  lastValidatedAt: string | null;
};

export type MetaCatalogVariantInput = {
  id: string;
  label: string;
  sku: string | null;
  priceFrom: number;
  priceFor: number;
  stockQuantity: number | null;
};

export type MetaCatalogProductInput = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  additionalImages: string[];
  active: boolean;
  kind: "simples" | "variacoes";
  category: string;
  variants: MetaCatalogVariantInput[];
};

export type MetaCatalogIssueSeverity = "error" | "warning";

export type MetaCatalogIssue = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantId: string | null;
  field: string;
  reason: string;
  recommendation: string;
  severity: MetaCatalogIssueSeverity;
};

export type MetaCatalogItem = {
  rowId: string;
  productId: string;
  productSlug: string;
  variantId: string | null;
  metaId: string | null;
  itemGroupId: string | null;
  title: string;
  description: string;
  link: string | null;
  imageLink: string | null;
  additionalImageLinks: string[];
  sku: string | null;
  kind: "product" | "variant";
  category: string;
  googleProductCategory: string | null;
  availability: "in stock" | "out of stock";
  quantity: number | null;
  price: number | null;
  salePrice: number | null;
  brand: string | null;
  mpn: string | null;
  gtin: string | null;
  included: boolean;
  exclusionReason: string | null;
  issues: MetaCatalogIssue[];
};

export type MetaCatalogReport = {
  generatedAt: string;
  feedUrl: string;
  stockControlled: boolean;
  xmlValid: boolean;
  settings: MetaCatalogSettings;
  metrics: {
    totalItems: number;
    mainProducts: number;
    variations: number;
    ignoredItems: number;
    ignoredProducts: number;
    warnings: number;
    errors: number;
  };
  items: MetaCatalogItem[];
  problems: MetaCatalogIssue[];
};

const invalidXmlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function normalizeMetaCatalogValue(value: string): string {
  return value.replace(invalidXmlCharacters, "").replace(/\s+/g, " ").trim();
}

export function cleanMetaCatalogText(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(invalidXmlCharacters, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeMetaCatalogXml(value: string): string {
  return value
    .replace(invalidXmlCharacters, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function absoluteMetaCatalogUrl(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  try {
    const url = new URL(normalized, META_CATALOG_SITE_URL);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function productUrl(slug: string): string | null {
  const normalized = slug.trim();
  if (!normalized || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(normalized)) return null;
  return `${META_CATALOG_SITE_URL}/produto/${encodeURIComponent(normalized)}`;
}

function isRealPrice(value: number): boolean {
  return Number.isFinite(value) && value > 0 && Math.abs(value - 1) > 0.0001;
}

function issue(input: {
  code: string;
  product: MetaCatalogProductInput;
  variantId?: string | null;
  field: string;
  reason: string;
  recommendation: string;
  severity: MetaCatalogIssueSeverity;
}): MetaCatalogIssue {
  return {
    id: `${input.product.id}:${input.variantId ?? "product"}:${input.code}`,
    productId: input.product.id,
    productSlug: input.product.slug,
    productName: input.product.name,
    variantId: input.variantId ?? null,
    field: input.field,
    reason: input.reason,
    recommendation: input.recommendation,
    severity: input.severity,
  };
}

function createCatalogItem(
  product: MetaCatalogProductInput,
  variant: MetaCatalogVariantInput | null,
  settings: MetaCatalogSettings,
): MetaCatalogItem {
  const issues: MetaCatalogIssue[] = [];
  const variation = product.kind === "variacoes" || product.variants.length > 1;
  const metaId = variant ? metaCatalogContentId(variant.id) : null;
  const link = productUrl(product.slug);
  const imageLink = absoluteMetaCatalogUrl(product.image);
  const description = cleanMetaCatalogText(product.description);
  const category = cleanMetaCatalogText(product.category) || cleanMetaCatalogText(settings.defaultCategory);
  const brand = cleanMetaCatalogText(settings.defaultBrand) || null;
  const currentPrice = variant?.priceFor ?? Number.NaN;
  const originalPrice = variant?.priceFrom ?? Number.NaN;
  const validCurrentPrice = isRealPrice(currentPrice);
  const hasSalePrice = settings.includeSalePrice && validCurrentPrice && isRealPrice(originalPrice) && originalPrice > currentPrice;
  const stockQuantity = variant?.stockQuantity ?? null;
  const availability = stockQuantity !== null && stockQuantity <= 0 ? "out of stock" : "in stock";

  if (!product.active) {
    issues.push(issue({
      code: "inactive",
      product,
      variantId: variant?.id,
      field: "Status",
      reason: "Produto inativo e não publicado na loja.",
      recommendation: "Ative o produto somente quando ele estiver pronto para venda.",
      severity: "error",
    }));
  }
  if (!variant || !metaId) {
    issues.push(issue({
      code: "incomplete_variant",
      product,
      variantId: variant?.id,
      field: "Variação",
      reason: "Produto sem uma unidade comercial completa.",
      recommendation: "Cadastre ao menos uma variação comprável com identificador e preço.",
      severity: "error",
    }));
  }
  if (!validCurrentPrice) {
    issues.push(issue({
      code: "invalid_price",
      product,
      variantId: variant?.id,
      field: "Preço",
      reason: Math.abs(currentPrice - 1) <= 0.0001
        ? "Preço de R$ 1,00 tratado como simbólico e não enviado ao catálogo."
        : "Preço atual ausente, zerado ou inválido.",
      recommendation: "Informe o preço real de venda da variação no cadastro do produto.",
      severity: "error",
    }));
  }
  if (!imageLink) {
    issues.push(issue({
      code: "missing_image",
      product,
      variantId: variant?.id,
      field: "Imagem",
      reason: "Imagem principal ausente ou com URL inválida.",
      recommendation: "Envie uma imagem pública válida como capa do produto.",
      severity: "error",
    }));
  }
  if (!link) {
    issues.push(issue({
      code: "invalid_url",
      product,
      variantId: variant?.id,
      field: "URL",
      reason: "O slug não permite montar uma URL pública válida.",
      recommendation: "Salve novamente o produto para gerar um slug válido.",
      severity: "error",
    }));
  }
  if (!description) {
    issues.push(issue({
      code: "empty_description",
      product,
      variantId: variant?.id,
      field: "Descrição",
      reason: "Descrição vazia após a limpeza do conteúdo.",
      recommendation: "Adicione uma descrição objetiva e comercial ao produto.",
      severity: "warning",
    }));
  }
  if (!brand) {
    issues.push(issue({
      code: "missing_brand",
      product,
      variantId: variant?.id,
      field: "Marca",
      reason: "Produto sem marca e sem marca padrão configurada.",
      recommendation: "Configure uma marca padrão na página do Catálogo da Meta.",
      severity: "warning",
    }));
  }
  if (!category) {
    issues.push(issue({
      code: "missing_category",
      product,
      variantId: variant?.id,
      field: "Categoria",
      reason: "Produto sem categoria e sem categoria padrão configurada.",
      recommendation: "Associe uma categoria ao produto ou configure uma categoria padrão.",
      severity: "warning",
    }));
  }
  if (availability === "out of stock") {
    issues.push(issue({
      code: settings.includeOutOfStock ? "out_of_stock" : "out_of_stock_excluded",
      product,
      variantId: variant?.id,
      field: "Estoque",
      reason: settings.includeOutOfStock
        ? "Variação sem estoque; será enviada como out of stock."
        : "Variação sem estoque excluída pela configuração do feed.",
      recommendation: "Reponha o estoque ou revise a opção de produtos sem estoque.",
      severity: settings.includeOutOfStock ? "warning" : "error",
    }));
  }

  const error = issues.find((item) => item.severity === "error");
  const included = settings.feedActive && !error;
  const additionalImageLinks = settings.includeAdditionalImages
    ? [...new Set(product.additionalImages.map(absoluteMetaCatalogUrl).filter((url): url is string => Boolean(url && url !== imageLink)))].slice(0, 10)
    : [];

  return {
    rowId: variant?.id ?? `${product.id}:missing-variant`,
    productId: product.id,
    productSlug: product.slug,
    variantId: variant?.id ?? null,
    metaId,
    itemGroupId: variation ? product.id : null,
    title: variation && variant ? `${normalizeMetaCatalogValue(product.name)} - ${normalizeMetaCatalogValue(variant.label)}` : normalizeMetaCatalogValue(product.name),
    description,
    link,
    imageLink,
    additionalImageLinks,
    sku: variant?.sku?.trim() || null,
    kind: variation ? "variant" : "product",
    category,
    googleProductCategory: cleanMetaCatalogText(settings.defaultCategory) || null,
    availability,
    quantity: stockQuantity,
    price: validCurrentPrice ? (hasSalePrice ? originalPrice : currentPrice) : null,
    salePrice: hasSalePrice ? currentPrice : null,
    brand,
    mpn: null,
    gtin: null,
    included,
    exclusionReason: included ? null : settings.feedActive ? error?.reason ?? "Item inválido." : "Feed desativado nas configurações.",
    issues,
  };
}

function appendDuplicateIdIssues(items: MetaCatalogItem[], products: MetaCatalogProductInput[]): MetaCatalogItem[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.metaId) counts.set(item.metaId, (counts.get(item.metaId) ?? 0) + 1);
  }
  const productById = new Map(products.map((product) => [product.id, product]));

  return items.map((item) => {
    if (!item.metaId || (counts.get(item.metaId) ?? 0) < 2) return item;
    const product = productById.get(item.productId);
    if (!product) return item;
    const duplicateIssue = issue({
      code: "duplicate_id",
      product,
      variantId: item.variantId,
      field: "ID da Meta",
      reason: `Identificador duplicado no feed: ${item.metaId}.`,
      recommendation: "Corrija o identificador da variação antes de sincronizar o catálogo.",
      severity: "error",
    });
    return {
      ...item,
      included: false,
      exclusionReason: duplicateIssue.reason,
      issues: [...item.issues, duplicateIssue],
    };
  });
}

export function buildMetaCatalogReport(
  products: MetaCatalogProductInput[],
  settings: MetaCatalogSettings,
  generatedAt = new Date(),
): MetaCatalogReport {
  const initialItems = products.flatMap((product) => {
    if (product.variants.length === 0) return [createCatalogItem(product, null, settings)];
    return product.variants.map((variant) => createCatalogItem(product, variant, settings));
  });
  const items = appendDuplicateIdIssues(initialItems, products);
  const includedItems = items.filter((item) => item.included);
  const ignoredProductIds = new Set(items.filter((item) => !item.included).map((item) => item.productId));
  for (const item of includedItems) ignoredProductIds.delete(item.productId);
  const problems = items.flatMap((item) => item.issues);

  return {
    generatedAt: generatedAt.toISOString(),
    feedUrl: `${META_CATALOG_SITE_URL}${META_CATALOG_FEED_PATH}`,
    stockControlled: products.some((product) => product.variants.some((variant) => variant.stockQuantity !== null)),
    xmlValid: true,
    settings,
    metrics: {
      totalItems: includedItems.length,
      mainProducts: new Set(includedItems.map((item) => item.productId)).size,
      variations: includedItems.filter((item) => item.kind === "variant").length,
      ignoredItems: items.length - includedItems.length,
      ignoredProducts: ignoredProductIds.size,
      warnings: problems.filter((item) => item.severity === "warning").length,
      errors: problems.filter((item) => item.severity === "error").length,
    },
    items,
    problems,
  };
}

function formatMetaCatalogPrice(value: number): string {
  return `${value.toFixed(2)} BRL`;
}

function renderXmlElement(name: string, value: string | number | null): string | null {
  if (value === null || value === "") return null;
  return `<${name}>${escapeMetaCatalogXml(String(value))}</${name}>`;
}

function renderMetaCatalogItem(item: MetaCatalogItem): string {
  const fields = [
    renderXmlElement("g:id", item.metaId),
    renderXmlElement("g:item_group_id", item.itemGroupId),
    renderXmlElement("g:title", item.title),
    renderXmlElement("g:description", item.description),
    renderXmlElement("g:link", item.link),
    renderXmlElement("g:image_link", item.imageLink),
    ...item.additionalImageLinks.map((image) => renderXmlElement("g:additional_image_link", image)),
    renderXmlElement("g:availability", item.availability),
    renderXmlElement("g:condition", "new"),
    renderXmlElement("g:price", item.price === null ? null : formatMetaCatalogPrice(item.price)),
    renderXmlElement("g:sale_price", item.salePrice === null ? null : formatMetaCatalogPrice(item.salePrice)),
    renderXmlElement("g:brand", item.brand),
    renderXmlElement("g:mpn", item.mpn),
    renderXmlElement("g:gtin", item.gtin),
    renderXmlElement("g:product_type", item.category),
    renderXmlElement("g:google_product_category", item.googleProductCategory),
    renderXmlElement("g:quantity_to_sell_on_facebook", item.quantity),
  ].filter((field): field is string => Boolean(field));

  return `    <item>\n      ${fields.join("\n      ")}\n    </item>`;
}

export function buildMetaCatalogXml(report: MetaCatalogReport): string {
  const items = report.items.filter((item) => item.included).map(renderMetaCatalogItem).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>${escapeMetaCatalogXml(report.settings.storeName)}</title>\n    <link>${escapeMetaCatalogXml(META_CATALOG_SITE_URL)}</link>\n    <description>Feed de produtos da ECOMZERO para o Meta Commerce Manager</description>\n${items ? `${items}\n` : ""}  </channel>\n</rss>`;
}

export function createMetaCatalogFeedResponse(
  report: MetaCatalogReport,
  options: { download?: boolean } = {},
): Response {
  if (!report.settings.feedActive) {
    return createMetaCatalogErrorResponse("Feed temporariamente inativo.", 503);
  }
  if (!report.xmlValid) {
    return createMetaCatalogErrorResponse("O catálogo não passou pela validação XML.", 500);
  }
  const headers = new Headers({
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (options.download) headers.set("Content-Disposition", "attachment; filename=meta-catalogo.xml");
  return new Response(buildMetaCatalogXml(report), { status: 200, headers });
}

export function createMetaCatalogErrorResponse(message: string, status = 500): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<error>${escapeMetaCatalogXml(message)}</error>`;
  return new Response(xml, {
    status,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
