"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, PackageOpen, XCircle } from "lucide-react";

import ProductCard from "@/components/ProductCard";
import { useProductFilters } from "@/components/ProductFiltersProvider";
import type { StoreCategory } from "@/lib/services/storeContentService";
import type { Product } from "@/types/product";

type ShowcaseProps = {
  produtos: Product[];
  categories: StoreCategory[];
  bestSellers: Product[];
  releases: Product[];
};

type ProductShelfProps = {
  title: string;
  subtitle: string;
  products: Product[];
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

function ProductShelf({ title, subtitle, products }: ProductShelfProps) {
  const shelfRef = useRef<HTMLDivElement | null>(null);

  const scrollShelf = (direction: -1 | 1) => {
    const shelf = shelfRef.current;
    if (!shelf) return;

    shelf.scrollBy({
      left: direction * shelf.clientWidth * 0.82,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  if (products.length === 0) return null;

  return (
    <section aria-labelledby={`shelf-${title.toLowerCase().replaceAll(" ", "-")}`}>
      <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
        <div>
          <span className="mb-3 block h-0.5 w-11 bg-[#A9EC17]" />
          <h2
            id={`shelf-${title.toLowerCase().replaceAll(" ", "-")}`}
            className="font-display text-xl font-bold uppercase text-white sm:text-2xl"
          >
            {title}
          </h2>
          <p className="mt-1 text-[11px] text-white/50 sm:text-xs">{subtitle}</p>
        </div>
        <Link
          href="/#vitrine"
          className="font-display inline-flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase text-[#A9EC17] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] sm:text-xs"
        >
          Ver todos
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scrollShelf(-1)}
          aria-label={`Ver produtos anteriores em ${title}`}
          className="absolute left-0 top-[42%] z-10 hidden h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-white/20 bg-black/90 text-white transition hover:border-[#A9EC17] hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] lg:flex"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div
          ref={shelfRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
        >
          {products.map((product, index) => (
            <div
              key={`${title}-${product.id}-${index}`}
              className="w-[84%] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)] xl:w-[calc((100%-3rem)/4)]"
            >
              <ProductCard product={product} layout="grid" />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollShelf(1)}
          aria-label={`Ver mais produtos em ${title}`}
          className="absolute right-0 top-[42%] z-10 hidden h-10 w-10 translate-x-1/2 items-center justify-center rounded-full border border-white/20 bg-black/90 text-white transition hover:border-[#A9EC17] hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] lg:flex"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}

export default function Showcase({
  produtos: allProdutos,
  categories,
  bestSellers,
  releases,
}: ShowcaseProps) {
  const { cat, searchQuery, setSearchQuery } = useProductFilters();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!cat) return;

    const element = sectionRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const currentTop = window.scrollY + rect.top;
    window.scrollTo({
      top: Math.max(0, currentTop - 88),
      behavior: "smooth",
    });
  }, [cat]);

  let products = allProdutos;
  let title = "Todos os produtos";
  let subtitle: ReactNode = "Produtos selecionados para facilitar sua rotina.";

  if (cat && cat !== "tudo") {
    const category = categories.find((item) => item.slug === cat);
    const categoryIds = new Set(category ? [category.id, ...category.descendantIds] : []);
    products = products.filter((product) => product.categoryId && categoryIds.has(product.categoryId));
    title = category?.nome ?? cat;
    subtitle = `Produtos da categoria ${category?.nome ?? cat}.`;
  }

  const trimmedSearch = searchQuery.trim();
  if (trimmedSearch) {
    const normalizedQuery = normalizeText(trimmedSearch);
    products = products.filter((product) =>
      normalizeText(product.nome).includes(normalizedQuery),
    );
    title = `Resultados para "${trimmedSearch}"`;
    subtitle = `${products.length} ${products.length === 1 ? "produto encontrado" : "produtos encontrados"}.`;
  }

  const hasFilter = Boolean((cat && cat !== "tudo") || trimmedSearch);

  return (
    <div
      id="vitrine"
      ref={sectionRef}
      className="mx-auto max-w-[1440px] scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20"
    >
      {allProdutos.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0D0D0D] px-6 text-center">
          <PackageOpen className="h-11 w-11 text-[#A9EC17]/45" strokeWidth={1.4} />
          <h2 className="font-display mt-4 text-lg font-bold uppercase text-white">Novos produtos em breve</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/45">Estamos preparando uma seleção renovada para a loja EcomZero.</p>
        </div>
      ) : hasFilter ? (
        <section aria-labelledby="filtered-products-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
            <div>
              <span className="mb-3 block h-0.5 w-11 bg-[#A9EC17]" />
              <h2
                id="filtered-products-title"
                className="font-display text-xl font-bold uppercase text-white sm:text-2xl"
              >
                {title}
              </h2>
              <p className="mt-1 text-xs text-white/50">{subtitle}</p>
            </div>
            <Link
              href="/#vitrine"
              onClick={() => setSearchQuery("")}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs text-white/70 transition hover:border-[#A9EC17] hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17]"
            >
              <XCircle className="h-4 w-4" />
              Limpar filtro
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#0D0D0D] px-6 py-12 text-center text-sm text-white/65">
              Nenhum produto encontrado nessa seleção. {" "}
              <Link href="/#vitrine" className="text-[#A9EC17] hover:underline">
                Ver todos
              </Link>
              .
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} layout="grid" />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="space-y-14 sm:space-y-16">
          <ProductShelf
            title="Mais vendidos"
            subtitle="Os produtos favoritos dos nossos clientes."
            products={bestSellers}
          />
          <ProductShelf
            title="Lançamentos"
            subtitle="Novidades selecionadas para você."
            products={releases}
          />
        </div>
      )}
    </div>
  );
}
