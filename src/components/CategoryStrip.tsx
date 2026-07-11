import {
  Car,
  Dumbbell,
  Grid2X2,
  House,
  Lightbulb,
  Monitor,
  Package,
  SprayCan,
  Watch,
  Wrench,
} from "lucide-react";

const categories = [
  { label: "Iluminação", icon: Lightbulb },
  { label: "Casa", icon: House },
  { label: "Eletrônicos", icon: Monitor },
  { label: "Utilidades", icon: Package },
  { label: "Ferramentas", icon: Wrench },
  { label: "Automotivo", icon: Car },
  { label: "Esportes", icon: Dumbbell },
  { label: "Acessórios", icon: Watch },
  { label: "Limpeza", icon: SprayCan },
  { label: "Tudo", icon: Grid2X2 },
];

export default function CategoryStrip() {
  return (
    <section className="border-y border-[#360808] bg-[#080000]">
      <div className="mx-auto flex max-w-[1440px] gap-3 overflow-x-auto px-5 py-4 [scrollbar-width:none] sm:justify-between sm:gap-5 lg:px-8 [&::-webkit-scrollbar]:hidden">
        {categories.map(({ label, icon: Icon }) => (
          <a
            key={label}
            href="#vitrine"
            className="group flex min-w-[82px] flex-col items-center gap-2 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#4A0B0B] bg-[#0D0202] text-[#A9EC17] transition group-hover:border-[#A9EC17]/60 group-hover:shadow-[0_0_20px_rgba(169,236,23,0.12)]">
              <Icon className="h-6 w-6" strokeWidth={1.4} />
            </span>
            <span className="text-[11px] font-medium text-white/85 transition group-hover:text-[#A9EC17]">
              {label}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
