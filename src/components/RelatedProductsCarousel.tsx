"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/product";

type RelatedProductsCarouselProps = {
  produtos: Product[];
  title?: string;
  eyebrow?: string;
};

export default function RelatedProductsCarousel({
  produtos,
  title = "Produtos relacionados",
  eyebrow = "Continue explorando",
}: RelatedProductsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollByAmount = (direction: 1 | -1) => {
    const element = scrollRef.current;
    if (!element) return;

    element.scrollBy({
      left: direction * element.clientWidth * 0.82,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  if (produtos.length === 0) return null;

  return (
    <section aria-labelledby="related-products-title">
      <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
        <div>
          <span className="mb-3 block h-0.5 w-11 bg-[#A9EC17]" />
          {eyebrow && (
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-[#A9EC17]">
              {eyebrow}
            </p>
          )}
          <h2
            id="related-products-title"
            className={`font-display text-xl font-bold text-white sm:text-2xl ${eyebrow ? "mt-2" : ""}`}
          >
            {title}
          </h2>
        </div>
        <Link
          href="/#vitrine"
          className="font-display shrink-0 text-[10px] font-bold uppercase text-[#A9EC17] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] sm:text-xs"
        >
          Ver toda a vitrine →
        </Link>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scrollByAmount(-1)}
          aria-label="Ver produtos anteriores"
          className="absolute left-0 top-[42%] z-10 hidden h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-white/20 bg-black/90 text-white transition hover:border-[#A9EC17] hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] lg:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
        >
          {produtos.map((produto) => (
            <div
              key={produto.id}
              className="w-[calc((100%-0.75rem)/2)] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4rem)/5)]"
            >
              <ProductCard product={produto} layout="grid" />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollByAmount(1)}
          aria-label="Ver mais produtos"
          className="absolute right-0 top-[42%] z-10 hidden h-10 w-10 translate-x-1/2 items-center justify-center rounded-full border border-white/20 bg-black/90 text-white transition hover:border-[#A9EC17] hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] lg:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
