"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, XCircle } from "lucide-react";

import ProductCard from "@/components/ProductCard";
import { useProductFilters } from "@/components/ProductFiltersProvider";
import categoriasData from "@/data/categorias.json";
import type { Product } from "@/types/product";

type ShowcaseProps = {
  produtos: Product[];
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
              className="w-[calc((100%-0.75rem)/2)] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4rem)/5)]"
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

function completeShelf(products: Product[], catalog: Product[], length: number) {
  if (products.length >= length || catalog.length === 0) {
    return products.slice(0, length);
  }

  const completed = [...products];
  let index = 0;

  while (completed.length < length) {
    const candidate = catalog[index % catalog.length];
    if (!completed.some((product) => product.id === candidate.id) || catalog.length < length) {
      completed.push(candidate);
    }
    index += 1;
  }

  return completed;
}

export default function Showcase({ produtos: allProdutos }: ShowcaseProps) {
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
    const category = categoriasData.categorias.find((item) => item.id === cat);
    products = products.filter((product) => product.categoria === cat);
    title = category?.label ?? cat;
    subtitle = `Produtos da categoria ${category?.label ?? cat}.`;
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
  const bestSellers = completeShelf(allProdutos.slice(0, 5), allProdutos, 5);
  const releases = completeShelf(allProdutos.slice(5, 10), allProdutos, 5);

  return (
    <div
      id="vitrine"
      ref={sectionRef}
      className="mx-auto max-w-[1440px] scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20"
    >
      {hasFilter ? (
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
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
