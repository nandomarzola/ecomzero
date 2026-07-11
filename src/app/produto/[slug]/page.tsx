import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Clock3,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchase from "@/components/ProductPurchase";
import products from "@/data/produtos.json";

type Product = (typeof products)[number];

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

const siteUrl = "https://www.ecomzero.com.br";

const relatedCategories = [
  {
    name: "Iluminação",
    description: "Luz para casa, trabalho e emergências",
    image: "/mock/produtos/luminaria.jpg",
  },
  {
    name: "Casa",
    description: "Soluções práticas para todos os ambientes",
    image: "/mock/produtos/cozinha.jpg",
  },
  {
    name: "Utilidades",
    description: "Produtos que facilitam sua rotina",
    image: "/mock/produtos/garrafa.jpg",
  },
  {
    name: "Ferramentas",
    description: "Itens resistentes para tarefas do dia a dia",
    image: "/mock/produtos/ferramentas.jpg",
  },
];

const purchaseBenefits = [
  {
    label: "Envio",
    value: "Rastreado",
    detail: "Acompanhe na Shopee",
    icon: Clock3,
  },
  {
    label: "Compra",
    value: "Protegida",
    detail: "Dentro da plataforma",
    icon: ShieldCheck,
  },
  {
    label: "Suporte",
    value: "Pela Shopee",
    detail: "Direto no pedido",
    icon: RefreshCw,
  },
];

const findProduct = (slug: string): Product | undefined =>
  products.find((product) => product.slug === slug);

export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = findProduct(slug);

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
    { "@type": "ListItem", position: 2, name: "Produtos", item: `${siteUrl}/#vitrine` },
    { "@type": "ListItem", position: 3, name: product.nome },
  ],
});

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = findProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_72%_25%,#230505_0%,#090101_34%,#000_68%)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductJsonLd(product)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(product)) }}
      />
      <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-8 lg:py-12">
        <nav className="mb-8 flex flex-wrap items-center gap-3 text-xs text-white/45" aria-label="Navegação estrutural">
          <Link href="/" className="transition hover:text-[#A9EC17]">
            Início
          </Link>
          <span>/</span>
          <Link href="/#vitrine" className="transition hover:text-[#A9EC17]">
            Produtos
          </Link>
          <span>/</span>
          <span className="font-semibold uppercase text-[#A9EC17]">{product.categoria}</span>
        </nav>

        <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] xl:gap-16">
          <ProductGallery images={product.imagens} productName={product.nome} />

          <div className="min-w-0 lg:sticky lg:top-28">
            <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-[#A9EC17]">
              {product.categoria}
            </p>
            <h1 className="font-display mt-4 text-3xl font-extrabold leading-[1.08] text-white sm:text-4xl xl:text-5xl">
              {product.nome}
            </h1>
            <p className="mt-4 text-lg text-white/65">{product.subtitulo}</p>

            <p className="mt-7 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              {product.descricao}
            </p>

            <ul className="mt-6 grid gap-3 text-sm text-white/72 sm:grid-cols-2">
              {product.caracteristicas.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A9EC17]" />
                  <span className="leading-6">{feature}</span>
                </li>
              ))}
            </ul>

            <ProductPurchase
              variants={product.variantes}
              shopeeUrl={product.linkShopee}
            />

            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-7">
              {purchaseBenefits.map(({ label, value, detail, icon: Icon }) => (
                <article key={label} className="min-w-0">
                  <Icon className="h-6 w-6 text-[#A9EC17]" strokeWidth={1.5} />
                  <p className="font-display mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white sm:text-base">{value}</p>
                  <p className="mt-1 text-[10px] leading-4 text-white/40 sm:text-xs">{detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20 border-t border-white/10 pt-12">
          <div className="mb-7 flex items-end justify-between gap-5">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-[#A9EC17]">
                Continue explorando
              </p>
              <h2 className="font-display mt-3 text-2xl font-bold text-white sm:text-3xl">
                Categorias relacionadas
              </h2>
            </div>
            <Link href="/#vitrine" className="hidden text-sm text-white/55 hover:text-[#A9EC17] sm:block">
              Ver toda a vitrine
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedCategories.map((category) => (
              <Link
                key={category.name}
                href="/#vitrine"
                className="group relative min-h-64 overflow-hidden rounded-xl border border-[#4D0B0B] bg-[#0A0101]"
              >
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 25vw"
                  className="object-cover opacity-55 transition duration-500 group-hover:scale-105 group-hover:opacity-70"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,rgba(0,0,0,0.94)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">{category.name}</h3>
                    <p className="mt-1 text-xs leading-5 text-white/55">{category.description}</p>
                  </div>
                  <ArrowUpRight className="h-6 w-6 shrink-0 text-[#A9EC17]" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
