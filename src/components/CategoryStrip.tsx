"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import type { StoreCategory } from "@/lib/services/storeContentService";

const iconMap = {
  iluminacao: Lightbulb,
  seguranca: ShieldCheck,
  ferramentas: Wrench,
  beleza: Heart,
  utilidades: Package,
  limpeza: SprayCan,
};

export default function CategoryStrip({ categories }: { categories: StoreCategory[] }) {
  const pathname = usePathname();
  const roots = categories.filter((category) => category.depth === 0);
  const items = [{ id: "tudo", nome: "Todas as categorias", slug: "tudo" }, ...roots];

  return (
    <section className="border-y border-white/[0.08] bg-[#080808]">
      <div className="mx-auto flex h-[58px] max-w-[1440px] items-stretch gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
        {items.map((categoria) => {
          const Icon =
            categoria.id === "tudo" ? Menu : iconMap[categoria.slug as keyof typeof iconMap] ?? Grid2X2;
          const categoryPath = `/categorias/${categoria.slug}`;
          const isActive =
            categoria.id === "tudo"
              ? pathname === "/"
              : pathname === categoryPath || pathname.startsWith(`${categoryPath}/`);
          const href = categoria.id === "tudo" ? "/" : categoryPath;

          return (
            <Link
              key={categoria.id}
              href={href}
              scroll={categoria.id !== "tudo"}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex shrink-0 items-center gap-2.5 px-3 text-center sm:px-4 ${categoria.id === "tudo" ? "min-w-[176px]" : ""}`}
            >
              <span
                className={`flex items-center justify-center transition ${
                  isActive
                    ? "text-[var(--brand-color)]"
                    : "text-[var(--brand-color)]/85 group-hover:text-[#B7FF23]"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
              </span>

              <span
                className={`whitespace-nowrap text-[11px] font-medium transition ${
                  isActive
                    ? "text-white"
                    : "text-white/68 group-hover:text-[var(--brand-color)]"
                }`}
              >
                {categoria.nome}
              </span>

              {isActive && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 bg-[var(--brand-color)]" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
