"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import PromoProductCard from "@/components/PromoProductCard";
import type { Product } from "@/types/product";

// Vitrine híbrida: até `lg` é um scroll horizontal com snap + setas (mostra um
// "peek" do próximo card); a partir de `lg` vira grid de 5 colunas. Mesma lista
// no DOM — só troca o modo de layout por breakpoint. Client Component por causa
// das setas (scroll imperativo).
export default function ProductShelf({
  products,
  variant = "default",
}: {
  products: Product[];
  variant?: "default" | "promo";
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth * 0.85,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const arrowClass =
    "absolute top-[38%] z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/80 text-white backdrop-blur transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] lg:hidden";

  return (
    <div className="relative">
      <button type="button" onClick={() => scroll(-1)} aria-label="Ver anteriores" className={`${arrowClass} left-1`}>
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] sm:gap-4 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:pb-0 lg:[scroll-snap-type:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[72%] shrink-0 snap-start sm:w-[47%] md:w-[31%] lg:w-full"
          >
            {variant === "promo" ? (
              <PromoProductCard product={product} />
            ) : (
              <ProductCard product={product} />
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={() => scroll(1)} aria-label="Ver próximos" className={`${arrowClass} right-1`}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
