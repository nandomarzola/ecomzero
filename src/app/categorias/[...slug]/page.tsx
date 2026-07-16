import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, PackageOpen } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getProductsByCategory } from "@/lib/services/productService";
import {
  getActiveCategories,
  resolveCategoryPath,
  type StoreCategory,
} from "@/lib/services/storeContentService";

const siteUrl = "https://www.ecomzero.com.br";

// Páginas de categoria são listagens dirigidas por banco — server-rendered sob
// demanda, mesmo padrão dinâmico de /produto/[slug] (a loja não usa ISR).
export const dynamic = "force-dynamic";

type CategoryPageProps = { params: Promise<{ slug: string[] }> };

function categoryHref(breadcrumb: StoreCategory[]): string {
  return `/categorias/${breadcrumb.map((c) => c.slug).join("/")}`;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveCategoryPath(slug);
  if (!resolved) return { title: "Categoria não encontrada" };

  const { category, breadcrumb } = resolved;
  const title = category.metaTitulo?.trim() || `${category.nome} | EcomZero`;
  const description =
    category.metaDescricao?.trim() ||
    category.descricao?.trim() ||
    `Confira os produtos da categoria ${category.nome} na EcomZero.`;
  const canonical = `${siteUrl}${categoryHref(breadcrumb)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const resolved = await resolveCategoryPath(slug);
  if (!resolved) notFound();

  const { category, breadcrumb, children, targetCategoryIds } = resolved;
  const products = await getProductsByCategory(targetCategoryIds, category.path);

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="mx-auto max-w-[1320px] px-4 pb-20 pt-5 sm:px-6 sm:pt-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Navegação estrutural" className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/45 sm:text-xs">
          <Link href="/" className="transition hover:text-[#A9EC17]">Loja</Link>
          {breadcrumb.map((crumb, index) => {
            const isLast = index === breadcrumb.length - 1;
            const href = categoryHref(breadcrumb.slice(0, index + 1));
            return (
              <span key={crumb.id} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-white/25" />
                {isLast ? (
                  <span className="text-white/70">{crumb.nome}</span>
                ) : (
                  <Link href={href} className="transition hover:text-[#A9EC17]">{crumb.nome}</Link>
                )}
              </span>
            );
          })}
        </nav>

        <header className="pb-6 pt-6 sm:pt-7">
          <h1 className="font-display text-[30px] font-extrabold leading-tight text-white sm:text-[38px]">
            {category.nome}
          </h1>
          <p className="mt-1.5 text-sm text-white/55">
            {products.length} {products.length === 1 ? "produto" : "produtos"}
          </p>

          {/* Chips de subcategorias */}
          {children.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {children.map((child) => (
                <Link
                  key={child.id}
                  href={categoryHref([...breadcrumb, child])}
                  className="inline-flex items-center rounded-full border border-white/12 bg-[#0D0D0D] px-3.5 py-1.5 text-xs font-medium text-white/75 transition hover:border-[#A9EC17]/40 hover:text-[#A9EC17]"
                >
                  {child.nome}
                </Link>
              ))}
            </div>
          )}
        </header>

        {products.length === 0 ? (
          <CategoryEmptyState currentId={category.id} />
        ) : (
          <section aria-label={`Produtos em ${category.nome}`} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} layout="grid" />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

async function CategoryEmptyState({ currentId }: { currentId: string }) {
  const roots = (await getActiveCategories()).filter(
    (category) => category.depth === 0 && category.id !== currentId,
  );

  return (
    <section className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] px-6 py-16 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-[#0A0A0A] text-white/30">
        <PackageOpen className="h-5 w-5" strokeWidth={1.7} />
      </span>
      <p className="mt-4 text-sm font-medium text-white/70">Nenhum produto encontrado nesta categoria</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-white/40">
        Explore outras categorias ou veja todos os produtos da loja.
      </p>

      {roots.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {roots.map((root) => (
            <Link
              key={root.id}
              href={`/categorias/${root.slug}`}
              className="inline-flex items-center rounded-full border border-white/12 bg-[#0A0A0A] px-3.5 py-1.5 text-xs font-medium text-white/75 transition hover:border-[#A9EC17]/40 hover:text-[#A9EC17]"
            >
              {root.nome}
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/#vitrine"
        className="font-display mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-[#A9EC17] px-6 text-xs font-bold uppercase text-black transition hover:brightness-110"
      >
        Ver todos os produtos
      </Link>
    </section>
  );
}
