"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export type MarketplaceHighlight = {
  name: string;
  preposition: "na" | "no";
  url: string;
  icon: ReactNode;
};

const ROTATION_SECONDS = 5;

// Mesmo padrão de rotação do AnnouncementBar (setInterval + respeito a
// prefers-reduced-motion) — não roda se só há 1 marketplace ativo.
export default function MarketplaceHighlightBarRotator({ marketplaces }: { marketplaces: MarketplaceHighlight[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (marketplaces.length <= 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(
      () => setActiveIndex((current) => (current + 1) % marketplaces.length),
      ROTATION_SECONDS * 1000,
    );
    return () => window.clearInterval(interval);
  }, [marketplaces.length]);

  const current = marketplaces[activeIndex % marketplaces.length];

  return (
    <a
      href={current.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label={`Comprar ${current.preposition} ${current.name}, loja oficial ECOMZERO — abre em uma nova aba`}
      className="group relative z-[1] flex min-h-11 w-full items-center bg-[var(--brand-color)] text-black transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
    >
      <span className="mx-auto flex w-full max-w-[1440px] items-center gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-6">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/10 sm:h-9 sm:w-9">
          {current.icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-extrabold uppercase tracking-wide sm:text-sm">
          Compre também {current.preposition} {current.name}
          <span className="hidden font-semibold normal-case tracking-normal opacity-75 sm:inline"> — Loja Oficial ECOMZERO</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--brand-color)] transition group-hover:gap-2 sm:px-4 sm:text-xs">
          Acessar loja <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </span>
    </a>
  );
}
