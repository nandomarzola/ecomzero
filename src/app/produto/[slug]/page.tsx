import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Clock3,
  Headphones,
  Package,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import CategoryStrip from "@/components/CategoryStrip";
import ProductDescription, {
  getProductSummary,
  shouldShowProductSubtitle,
} from "@/components/ProductDescription";
import ProductGallery from "@/components/ProductGallery";
import ProductMarketplaces from "@/components/ProductMarketplaces";
import ProductPurchase from "@/components/ProductPurchase";
import ProductReviews from "@/components/ProductReviews";
import RelatedProductsCarousel from "@/components/RelatedProductsCarousel";
import TrustBadges from "@/components/TrustBadges";
import { auth } from "@/lib/auth";
import { buildAggregateRating } from "@/lib/reviews/reviewDomain";
import {
  findCategoryLabel,
  getAllProducts,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/services/productService";
import type { Product } from "@/types/product";
import { getActiveCategories } from "@/lib/services/storeContentService";
import {
  getProductReviewEligibility,
  getProductReviewsOverview,
} from "@/lib/services/productReviewService";
import { serializeJsonLd } from "@/lib/jsonLd";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

const siteUrl = "https://www.ecomzero.com.br";

// Imagem pode ser caminho relativo (/public legado) ou URL absoluta (Vercel
// Blob, cadastro via admin). Para metadata/structured data prependemos siteUrl
// só nos relativos.
const toAbsoluteImage = (path: string) =>
  path.startsWith("http") ? path : `${siteUrl}${path}`;

const featureIcons = [Tag, Package, Sparkles, Clock3];

const trustBadges = [
  { icon: ShieldCheck, title: "Compra 100% segura", detail: "Seus dados protegidos" },
  { icon: Clock3, title: "Envio rápido", detail: "Para todo o Brasil" },
  { icon: RefreshCw, title: "Troca garantida", detail: "Até 7 dias após o recebimento" },
  { icon: Headphones, title: "Atendimento humano", detail: "Suporte rápido e dedicado" },
];

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Produto não encontrado",
      robots: { index: false, follow: false },
    };
  }

  const productUrl = `${siteUrl}/produto/${product.slug}`;
  const imageUrl = toAbsoluteImage(product.imagem);
  const productSummary = getProductSummary({
    productName: product.nome,
    subtitle: product.subtitulo,
    description: product.descricao,
  });

  return {
    title: product.nome,
    description: productSummary,
    alternates: { canonical: productUrl },
    openGraph: {
      title: product.nome,
      description: productSummary,
      url: productUrl,
      siteName: "EcomZero",
      locale: "pt_BR",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1024,
          height: 1024,
          alt: product.nome,
        },
      ],
    },
  };
}

const buildProductJsonLd = (
  product: Product,
  reviewAggregate: { average: number | null; count: number },
) => {
  const prices = product.variantes.map((variant) => variant.precoPor);
  const productSummary = getProductSummary({
    productName: product.nome,
    subtitle: product.subtitulo,
    description: product.descricao,
  });
  const aggregateRating = buildAggregateRating(
    reviewAggregate.average,
    reviewAggregate.count,
  );

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nome,
    description: productSummary,
    image: product.imagens.map(toAbsoluteImage),
    category: product.categoria,
    url: `${siteUrl}/produto/${product.slug}`,
    brand: { "@type": "Brand", name: "EcomZero" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BRL",
      lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2),
      offerCount: product.variantes.length,
      availability: "https://schema.org/InStock",
      url: product.linkShopee ?? `${siteUrl}/produto/${product.slug}`,
      seller: { "@type": "Organization", name: "EcomZero" },
    },
    ...(aggregateRating ? { aggregateRating } : {}),
  };
};

const buildBreadcrumbJsonLd = (product: Product) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Início", item: siteUrl },
    {
      "@type": "ListItem",
      position: 2,
      name: "Produtos",
      item: `${siteUrl}/produtos`,
    },
    { "@type": "ListItem", position: 3, name: product.nome },
  ],
});

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [allProducts, categories, reviewOverview, session] = await Promise.all([
    getAllProducts(),
    getActiveCategories(),
    getProductReviewsOverview(product.id),
    auth(),
  ]);
  const reviewEligibility = session?.user.id
    ? await getProductReviewEligibility(session.user.id, product.id)
    : null;
  const relatedProducts = getRelatedProducts(product, allProducts);
  const categoryLabel = findCategoryLabel(product.categoria) ?? product.categoria;

  // Cadeia completa de categorias do produto (raiz → folha), para o breadcrumb
  // refletir todos os N níveis. Casa por categoryId (FK) ou, no legado/Hub sem
  // FK, pelo path denormalizado `categoria`. Cada nível vira link para a rota
  // real /categorias/<caminho-de-slugs>.
  const catById = new Map(categories.map((c) => [c.id, c]));
  const catByPath = new Map(categories.map((c) => [c.path, c]));
  const leafCategory = product.categoryId
    ? catById.get(product.categoryId)
    : catByPath.get(product.categoria);
  const categoryTrail: { nome: string; href: string }[] = [];
  {
    const chain: typeof categories = [];
    const seen = new Set<string>();
    let cur = leafCategory;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      chain.unshift(cur);
      cur = cur.parentId ? catById.get(cur.parentId) : undefined;
    }
    for (let i = 0; i < chain.length; i += 1) {
      categoryTrail.push({
        nome: chain[i].nome,
        href: `/categorias/${chain.slice(0, i + 1).map((c) => c.slug).join("/")}`,
      });
    }
  }
  const showSubtitle = shouldShowProductSubtitle(product.nome, product.subtitulo);
  const productSummary = getProductSummary({
    productName: product.nome,
    subtitle: product.subtitulo,
    description: product.descricao,
  });
  const marketplaceLinks = {
    shopee: product.linkShopee,
    mercadoLivre: product.linkMercadoLivre,
    tiktokShop: product.linkTiktokShop,
    shein: product.linkShein,
  };

  return (
    <div className="product-detail-page min-h-screen bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            buildProductJsonLd(product, {
              average: reviewOverview.average,
              count: reviewOverview.count,
            }),
          ),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildBreadcrumbJsonLd(product)),
        }}
      />

      <CategoryStrip categories={categories} />

      <div className="mx-auto max-w-[1440px] px-4 pb-14 pt-5 sm:px-6 sm:pb-16 sm:pt-7 lg:px-10 lg:pb-20">
        <nav
          className="mb-5 flex flex-wrap items-center gap-2 text-[11px] text-white/42 sm:gap-3 sm:text-xs lg:mb-6"
          aria-label="Navegação estrutural"
        >
          <Link href="/" className="transition hover:text-[var(--brand-color)]">
            Início
          </Link>

          {categoryTrail.length > 0 ? (
            categoryTrail.map((crumb, index) => (
              <span key={crumb.href} className="flex items-center gap-2 sm:gap-3">
                <span>/</span>
                <Link
                  href={crumb.href}
                  className={
                    index === categoryTrail.length - 1
                      ? "font-semibold uppercase text-[var(--brand-color)] transition hover:brightness-110"
                      : "transition hover:text-[var(--brand-color)]"
                  }
                >
                  {crumb.nome}
                </Link>
              </span>
            ))
          ) : (
            <>
              <span>/</span>
              <Link href="/produtos" className="transition hover:text-[var(--brand-color)]">
                Produtos
              </Link>
              <span>/</span>
              <span className="font-semibold uppercase text-[var(--brand-color)]">{categoryLabel}</span>
            </>
          )}
        </nav>

        <section className="grid items-start gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(420px,0.96fr)] xl:gap-12">
          <ProductGallery
            images={product.imagens}
            productName={product.nome}
          />

          <div className="w-full min-w-0 lg:sticky lg:top-24">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--brand-color)] sm:text-xs">
              {categoryLabel}
            </p>

            <h1
              title={product.nome}
              className="font-display mt-2 line-clamp-3 max-w-[760px] break-words text-[27px] font-extrabold leading-[1.08] text-white sm:text-[32px] lg:text-balance xl:text-[36px]"
            >
              {product.nome}
            </h1>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--brand-color)]/20 bg-[var(--brand-color)]/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/72">
              <BadgeCheck className="h-4 w-4 text-[var(--brand-color)]" strokeWidth={1.8} />
              Produto selecionado pela EcomZero
            </div>

            <div className="mt-5 max-w-2xl border-l-2 border-[var(--brand-color)]/55 pl-4">
              {showSubtitle && (
                <p className="line-clamp-2 text-sm font-medium leading-6 text-white/74 sm:text-[15px]">
                  {product.subtitulo}
                </p>
              )}
              {productSummary && (
                <p className={`${showSubtitle ? "mt-1.5" : ""} line-clamp-4 text-[13px] leading-6 text-white/52 sm:text-sm`}>
                  {productSummary}
                </p>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-white/[0.08] py-5 sm:grid-cols-3 xl:grid-cols-5">
              {product.caracteristicas.map((feature, index) => {
                const Icon = featureIcons[index % featureIcons.length];
                return (
                  <div
                    key={feature}
                    className="flex min-w-0 items-start gap-2"
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-color)]" strokeWidth={1.7} />
                    <span className="text-[10px] leading-[1.4] text-white/65 xl:text-[10.5px]">
                      {feature}
                    </span>
                  </div>
                );
              })}
            </div>

            <ProductPurchase
              variants={product.variantes}
              productName={product.nome}
              productImage={product.imagem}
              marketplaceLinks={marketplaceLinks}
            />
          </div>
        </section>

        <ProductMarketplaces links={marketplaceLinks} />

        <TrustBadges
          items={trustBadges}
          className="mt-5 grid-cols-2 lg:grid-cols-4"
        />

        <ProductDescription
          productName={product.nome}
          subtitle={product.subtitulo}
          description={product.descricao}
        />

        <ProductReviews
          reviews={reviewOverview.reviews}
          average={reviewOverview.average}
          total={reviewOverview.count}
          reviewForm={
            reviewEligibility
              ? { productId: product.id, productName: product.nome }
              : null
          }
        />

        {relatedProducts.length > 0 && (
          <div className="mt-12 border-t border-white/[0.08] pt-9 sm:mt-16 sm:pt-11">
            <RelatedProductsCarousel produtos={relatedProducts} />
          </div>
        )}
      </div>
    </div>
  );
}
