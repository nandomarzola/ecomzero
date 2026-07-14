"use client";

import Link from "next/link";
import { useProductFilters } from "@/components/ProductFiltersProvider";
import {
  Grid2X2,
  Heart,
  Lightbulb,
  Menu,
  Package,
  ShieldCheck,
  SprayCan,
  Wrench,
} from "lucide-react";

import categoriasData from "@/data/categorias.json";

const iconMap = {
  tudo: Menu,
  iluminacao: Lightbulb,
  seguranca: ShieldCheck,
  ferramentas: Wrench,
  beleza: Heart,
  utilidades: Package,
  limpeza: SprayCan,
};

export default function CategoryStrip() {
  const { cat } = useProductFilters();
  const active = cat ?? "tudo";

  return (
    <section className="border-y border-white/[0.08] bg-[#080808]">
      <div className="mx-auto flex h-[58px] max-w-[1440px] items-stretch gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
        {categoriasData.categorias.map((categoria) => {
          const Icon =
            iconMap[categoria.id as keyof typeof iconMap] ?? Grid2X2;
          const isActive = active === categoria.id;
          const href =
            categoria.id === "tudo"
              ? "/#vitrine"
              : `/?cat=${categoria.id}#vitrine`;

          return (
            <Link
              key={categoria.id}
              href={href}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex shrink-0 items-center gap-2.5 px-3 text-center sm:px-4 ${categoria.id === "tudo" ? "min-w-[176px]" : ""}`}
            >
              <span
                className={`flex items-center justify-center transition ${
                  isActive
                    ? "text-[#A9EC17]"
                    : "text-[#A9EC17]/85 group-hover:text-[#B7FF23]"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
              </span>

              <span
                className={`whitespace-nowrap text-[11px] font-medium transition ${
                  isActive
                    ? "text-white"
                    : "text-white/68 group-hover:text-[#A9EC17]"
                }`}
              >
                {categoria.id === "tudo" ? "Todas as categorias" : categoria.label}
              </span>

              {isActive && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 bg-[#A9EC17]" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
