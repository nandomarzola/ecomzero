"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Grid2X2,
  Heart,
  Lightbulb,
  Package,
  ShieldCheck,
  SprayCan,
  Wrench,
} from "lucide-react";

import categoriasData from "@/data/categorias.json";

const iconMap = {
  tudo: Grid2X2,
  iluminacao: Lightbulb,
  seguranca: ShieldCheck,
  ferramentas: Wrench,
  beleza: Heart,
  utilidades: Package,
  limpeza: SprayCan,
};

export default function CategoryStrip() {
  const searchParams = useSearchParams();
  const active = searchParams.get("cat") ?? (searchParams.get("f") ? "" : "tudo");

  return (
    <section className="border-y border-[#360808] bg-[#080000]">
      <div className="mx-auto flex max-w-[1440px] gap-3 overflow-x-auto px-5 py-4 [scrollbar-width:none] sm:justify-center sm:gap-8 lg:px-8 [&::-webkit-scrollbar]:hidden">
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
              className="group flex min-w-[90px] flex-col items-center gap-2 text-center"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full border transition ${
                  isActive
                    ? "border-[#A9EC17] bg-[#151a03] text-[#A9EC17] shadow-[0_0_20px_rgba(169,236,23,0.2)]"
                    : "border-[#4A0B0B] bg-[#0D0202] text-[#A9EC17] group-hover:border-[#A9EC17]/60 group-hover:shadow-[0_0_20px_rgba(169,236,23,0.12)]"
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={1.4} />
              </span>

              <span
                className={`text-[11px] font-medium transition ${
                  isActive
                    ? "text-[#A9EC17]"
                    : "text-white/85 group-hover:text-[#A9EC17]"
                }`}
              >
                {categoria.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
