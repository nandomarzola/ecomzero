import produtos from "@/data/produtos.json";

export const dynamic = "force-static";

const SITE_URL = "https://www.ecomzero.com.br";
const BRAND = "EcomZero";

type Variante = {
  id: string;
  label: string;
  precoDe: number;
  precoPor: number;
};

type Produto = (typeof produtos)[number];

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const cdata = (value: string) =>
  `<![CDATA[${value.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;

const formatPrice = (value: number) => `${value.toFixed(2)} BRL`;

const absoluteUrl = (path: string) =>
  path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

const buildItem = (produto: Produto, variante: Variante, hasMultipleVariants: boolean) => {
  const id = hasMultipleVariants
    ? `${produto.slug}-${variante.id}`
    : produto.slug;

  const title = hasMultipleVariants
    ? `${produto.nome} - ${variante.label}`
    : produto.nome;

  const link = `${SITE_URL}/produto/${produto.slug}`;
  const imageLink = absoluteUrl(produto.imagem);

  const parts = [
    `<g:id>${escapeXml(id)}</g:id>`,
    `<g:title>${cdata(title)}</g:title>`,
    `<g:description>${cdata(produto.descricao)}</g:description>`,
    `<g:link>${escapeXml(link)}</g:link>`,
    `<g:image_link>${escapeXml(imageLink)}</g:image_link>`,
    `<g:availability>in stock</g:availability>`,
    `<g:inventory>999</g:inventory>`,
    `<g:quantity_to_sell_on_facebook>999</g:quantity_to_sell_on_facebook>`,
    `<g:condition>new</g:condition>`,
    `<g:price>${escapeXml(formatPrice(variante.precoPor))}</g:price>`,
    `<g:brand>${escapeXml(BRAND)}</g:brand>`,
    `<g:item_group_id>${escapeXml(produto.slug)}</g:item_group_id>`,
    `<g:google_product_category>${escapeXml(produto.categoria)}</g:google_product_category>`,
    `<g:product_type>${escapeXml(produto.categoria)}</g:product_type>`,
  ];

  const additionalImages = produto.imagens
    .filter((img) => img !== produto.imagem)
    .slice(0, 10);
  for (const img of additionalImages) {
    parts.push(`<g:additional_image_link>${escapeXml(absoluteUrl(img))}</g:additional_image_link>`);
  }

  return `<item>${parts.join("")}</item>`;
};

export function GET() {
  const items: string[] = [];
  for (const produto of produtos as Produto[]) {
    const hasMultipleVariants = produto.variantes.length > 1;
    for (const variante of produto.variantes) {
      items.push(buildItem(produto, variante, hasMultipleVariants));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${escapeXml(BRAND)}</title>
<link>${escapeXml(SITE_URL)}</link>
<description>Feed de produtos EcomZero para o Meta Commerce Manager</description>
${items.join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
