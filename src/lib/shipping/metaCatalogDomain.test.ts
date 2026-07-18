import assert from "node:assert/strict";
import test from "node:test";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  buildMetaCatalogReport,
  buildMetaCatalogXml,
  createMetaCatalogFeedResponse,
  type MetaCatalogProductInput,
  type MetaCatalogSettings,
} from "@/lib/metaCatalogDomain";
import { metaPixelContentIds } from "@/lib/client/metaPixel";

const settings: MetaCatalogSettings = {
  feedActive: true,
  includeOutOfStock: true,
  includeSalePrice: true,
  includeAdditionalImages: true,
  defaultBrand: "EcomZero & Cia",
  defaultCategory: "Casa > Utilidades",
  storeName: "ECOMZERO",
  lastValidatedAt: null,
};

function product(overrides: Partial<MetaCatalogProductInput> = {}): MetaCatalogProductInput {
  return {
    id: "product-1",
    slug: "produto-teste",
    name: "Produto & Casa <Novo>",
    description: "<p>Uso seguro & fácil.</p>",
    image: "/images/capa.jpg",
    additionalImages: ["/images/detalhe.jpg"],
    active: true,
    kind: "simples",
    category: "Casa / Utilidades",
    variants: [{
      id: "variant-1",
      label: "Padrão",
      sku: "EZ-001",
      priceFrom: 39.9,
      priceFor: 31.99,
      stockQuantity: null,
    }],
    ...overrides,
  };
}

test("responde HTTP 200 com Content-Type XML e documento bem formado", async () => {
  const report = buildMetaCatalogReport([product()], settings, new Date("2026-07-18T20:00:00.000Z"));
  const response = createMetaCatalogFeedResponse(report);
  const xml = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/xml; charset=utf-8");
  assert.equal(XMLValidator.validate(xml), true);
});

test("responde XML 503 quando o feed está desativado e oferece download quando ativo", async () => {
  const inactive = buildMetaCatalogReport([product()], { ...settings, feedActive: false });
  const inactiveResponse = createMetaCatalogFeedResponse(inactive);
  assert.equal(inactiveResponse.status, 503);
  assert.equal(inactiveResponse.headers.get("content-type"), "application/xml; charset=utf-8");
  assert.equal(XMLValidator.validate(await inactiveResponse.text()), true);

  const active = buildMetaCatalogReport([product()], settings);
  const downloadResponse = createMetaCatalogFeedResponse(active, { download: true });
  assert.equal(downloadResponse.headers.get("content-disposition"), "attachment; filename=meta-catalogo.xml");
});

test("escapa caracteres especiais e limpa HTML da descrição", () => {
  const xml = buildMetaCatalogXml(buildMetaCatalogReport([product()], settings));

  assert.match(xml, /Produto &amp; Casa &lt;Novo&gt;/);
  assert.match(xml, /Uso seguro &amp; fácil\./);
  assert.doesNotMatch(xml, /<p>/);
  assert.equal(XMLValidator.validate(xml), true);
});

test("inclui ativos e ignora produtos inativos", () => {
  const report = buildMetaCatalogReport([
    product(),
    product({ id: "product-2", slug: "produto-inativo", active: false, variants: [{ id: "variant-2", label: "Padrão", sku: null, priceFrom: 10, priceFor: 10, stockQuantity: null }] }),
  ], settings);

  assert.equal(report.metrics.totalItems, 1);
  assert.equal(report.items.find((item) => item.variantId === "variant-1")?.included, true);
  assert.equal(report.items.find((item) => item.variantId === "variant-2")?.included, false);
});

test("formata preço em BRL e envia promoção somente quando válida e habilitada", () => {
  const enabledReport = buildMetaCatalogReport([product()], settings);
  const enabledXml = buildMetaCatalogXml(enabledReport);
  assert.match(enabledXml, /<g:price>39\.90 BRL<\/g:price>/);
  assert.match(enabledXml, /<g:sale_price>31\.99 BRL<\/g:sale_price>/);

  const disabledReport = buildMetaCatalogReport([product()], { ...settings, includeSalePrice: false });
  const disabledXml = buildMetaCatalogXml(disabledReport);
  assert.match(disabledXml, /<g:price>31\.99 BRL<\/g:price>/);
  assert.doesNotMatch(disabledXml, /g:sale_price/);
});

test("exclui preço simbólico de R$ 1,00", () => {
  const report = buildMetaCatalogReport([product({ variants: [{ id: "variant-1", label: "Padrão", sku: null, priceFrom: 1, priceFor: 1, stockQuantity: null }] })], settings);
  assert.equal(report.metrics.totalItems, 0);
  assert.match(report.items[0]?.exclusionReason ?? "", /simbólico/);
});

test("mantém sem estoque como out of stock ou exclui conforme configuração", () => {
  const withoutStock = product({ variants: [{ id: "variant-1", label: "Padrão", sku: null, priceFrom: 20, priceFor: 20, stockQuantity: 0 }] });
  const included = buildMetaCatalogReport([withoutStock], settings);
  assert.equal(included.items[0]?.included, true);
  assert.equal(included.items[0]?.availability, "out of stock");

  const excluded = buildMetaCatalogReport([withoutStock], { ...settings, includeOutOfStock: false });
  assert.equal(excluded.items[0]?.included, false);
});

test("gera uma entrada por variação com item_group_id compartilhado", () => {
  const report = buildMetaCatalogReport([product({
    kind: "variacoes",
    variants: [
      { id: "variant-1", label: "1 unidade", sku: "EZ-1", priceFrom: 10, priceFor: 10, stockQuantity: 5 },
      { id: "variant-2", label: "2 unidades", sku: "EZ-2", priceFrom: 18, priceFor: 18, stockQuantity: 3 },
    ],
  })], settings);

  assert.deepEqual(report.items.map((item) => item.metaId), ["variant-1", "variant-2"]);
  assert.equal(report.items.every((item) => item.itemGroupId === "product-1"), true);
  assert.equal(report.metrics.variations, 2);
});

test("rejeita IDs duplicados e produtos estruturalmente inválidos", () => {
  const duplicate = product({ id: "product-2", slug: "duplicado", variants: [{ id: "variant-1", label: "Outra", sku: null, priceFrom: 12, priceFor: 12, stockQuantity: null }] });
  const invalid = product({ id: "product-3", slug: "slug inválido", image: "", variants: [] });
  const report = buildMetaCatalogReport([product(), duplicate, invalid], settings);

  assert.equal(report.items.filter((item) => item.metaId === "variant-1").every((item) => !item.included), true);
  assert.equal(report.problems.some((item) => item.field === "ID da Meta"), true);
  assert.equal(report.problems.some((item) => item.field === "Imagem"), true);
  assert.equal(report.problems.some((item) => item.field === "Variação"), true);
  assert.equal(report.problems.some((item) => item.field === "URL"), true);
});

test("sempre entrega links e imagens absolutos", () => {
  const report = buildMetaCatalogReport([product()], settings);
  const item = report.items[0];
  assert.equal(item?.link, "https://www.ecomzero.com.br/produto/produto-teste");
  assert.equal(item?.imageLink, "https://www.ecomzero.com.br/images/capa.jpg");
  assert.deepEqual(item?.additionalImageLinks, ["https://www.ecomzero.com.br/images/detalhe.jpg"]);

  const withoutAdditionalImages = buildMetaCatalogReport([product()], { ...settings, includeAdditionalImages: false });
  assert.deepEqual(withoutAdditionalImages.items[0]?.additionalImageLinks, []);
});

test("usa exatamente o mesmo UUID de variante no XML e content_ids do Pixel", () => {
  const report = buildMetaCatalogReport([product()], settings);
  const xml = buildMetaCatalogXml(report);
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml) as {
    rss: { channel: { item: { "g:id": string } } };
  };
  const feedId = parsed.rss.channel.item["g:id"];
  const pixelIds = metaPixelContentIds([{ variantId: "variant-1", quantity: 1, unitPrice: 31.99 }]);
  assert.equal(feedId, "variant-1");
  assert.deepEqual(pixelIds, [feedId]);
});
