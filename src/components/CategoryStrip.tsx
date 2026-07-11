import {
  Grid2X2,
  Heart,
  Lightbulb,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import categoriasData from "@/data/categorias.json";

const iconMap = {
  iluminacao: Lightbulb,
  seguranca: ShieldCheck,
  ferramentas: Wrench,
  beleza: Heart,
  tudo: Grid2X2,
};

export default function CategoryStrip() {
  return (
    <section className="border-y border-[#360808] bg-[#080000]">
      <div className="mx-auto flex max-w-[1440px] gap-3 overflow-x-auto px-5 py-4 [scrollbar-width:none] sm:justify-center sm:gap-8 lg:px-8 [&::-webkit-scrollbar]:hidden">
        {categoriasData.categorias.map((categoria) => {
          const Icon =
            iconMap[categoria.id as keyof typeof iconMap] ?? Grid2X2;

          return (
            <a
              key={categoria.id}
              href="#vitrine"
              className="group flex min-w-[90px] flex-col items-center gap-2 text-center"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#4A0B0B] bg-[#0D0202] text-[#A9EC17] transition group-hover:border-[#A9EC17]/60 group-hover:shadow-[0_0_20px_rgba(169,236,23,0.12)]">
                <Icon className="h-6 w-6" strokeWidth={1.4} />
              </span>

              <span className="text-[11px] font-medium text-white/85 transition group-hover:text-[#A9EC17]">
                {categoria.label}
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}