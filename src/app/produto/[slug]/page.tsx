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
import ProductGallery from "@/components/ProductGallery";
import ProductPurchase from "@/components/ProductPurchase";
import RelatedProductsCarousel from "@/components/RelatedProductsCarousel";
import TrustBadges from "@/components/TrustBadges";
import {
  findCategoryLabel,
  getAllProducts,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/services/productService";
import type { Product } from "@/types/product";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

const siteUrl = "https://www.ecomzero.com.br";

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
  const imageUrl = `${siteUrl}${product.imagem}`;

  return {
    title: product.nome,
    description: product.descricao,
    alternates: { canonical: productUrl },
    openGraph: {
      title: product.nome,
      description: product.descricao,
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

const buildProductJsonLd = (product: Product) => {
  const prices = product.variantes.map((variant) => variant.precoPor);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nome,
    description: product.descricao,
    image: product.imagens.map((image) => `${siteUrl}${image}`),
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
      url: product.linkShopee,
      seller: { "@type": "Organization", name: "EcomZero" },
    },
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
      item: `${siteUrl}/#vitrine`,
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

  const allProducts = await getAllProducts();
  const relatedProducts = getRelatedProducts(product, allProducts);
  const categoryLabel = findCategoryLabel(product.categoria) ?? product.categoria;

  return (
    <div className="product-detail-page min-h-screen bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildProductJsonLd(product)),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBreadcrumbJsonLd(product)),
        }}
      />

      <CategoryStrip />

      <div className="mx-auto max-w-[1440px] px-4 pb-14 pt-5 sm:px-6 sm:pb-16 sm:pt-7 lg:px-10 lg:pb-20">
        <nav
          className="mb-5 flex flex-wrap items-center gap-2 text-[11px] text-white/42 sm:gap-3 sm:text-xs lg:mb-6"
          aria-label="Navegação estrutural"
        >
          <Link href="/" className="transition hover:text-[#A9EC17]">
            Início
          </Link>

          <span>/</span>

          <Link
            href="/#vitrine"
            className="transition hover:text-[#A9EC17]"
          >
            Produtos
          </Link>

          <span>/</span>

          <span className="font-semibold uppercase text-[#A9EC17]">
            {categoryLabel}
          </span>
        </nav>

        <section className="grid items-start gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(420px,0.96fr)] xl:gap-12">
          <ProductGallery
            images={product.imagens}
            productName={product.nome}
          />

          <div className="w-full min-w-0 lg:sticky lg:top-24">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.24em] text-[#A9EC17] sm:text-xs">
              {categoryLabel}
            </p>

            <h1 className="font-display mt-2 max-w-full break-words text-[28px] font-extrabold leading-[1.08] text-white sm:text-4xl lg:text-balance lg:text-[40px]">
              {product.nome}
            </h1>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#A9EC17]/20 bg-[#A9EC17]/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/72">
              <BadgeCheck className="h-4 w-4 text-[#A9EC17]" strokeWidth={1.8} />
              Produto selecionado pela EcomZero
            </div>

            <p className="mt-6 text-sm leading-6 text-white/72 sm:text-[15px]">
              {product.subtitulo}
            </p>

            <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-white/52 sm:text-sm">
              {product.descricao}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-white/[0.08] py-5 sm:grid-cols-3 xl:grid-cols-5">
              {product.caracteristicas.map((feature, index) => {
                const Icon = featureIcons[index % featureIcons.length];
                return (
                  <div
                    key={feature}
                    className="flex min-w-0 items-start gap-2"
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#A9EC17]" strokeWidth={1.7} />
                    <span className="text-[10px] leading-[1.4] text-white/65 xl:text-[10.5px]">
                      {feature}
                    </span>
                  </div>
                );
              })}
            </div>

            <ProductPurchase variants={product.variantes} fallbackShopeeUrl={product.linkShopee} />
          </div>
        </section>

        <TrustBadges
          items={trustBadges}
          className="mt-5 grid-cols-2 lg:grid-cols-4"
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
