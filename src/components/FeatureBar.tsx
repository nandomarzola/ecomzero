import { BadgeCheck, Headphones, ShieldCheck, Truck } from "lucide-react";

const features = [
  { title: "COMPRA 100% SEGURA", subtitle: "Seus dados protegidos", icon: ShieldCheck },
  { title: "ENVIO PARA TODO BRASIL", subtitle: "Receba em qualquer estado", icon: Truck },
  { title: "ATENDIMENTO HUMANO", subtitle: "Suporte rápido e dedicado", icon: Headphones },
  { title: "PRODUTOS SELECIONADOS", subtitle: "Qualidade que você confia", icon: BadgeCheck },
];

export default function FeatureBar() {
  return (
    <section className="border-b border-white/[0.08] bg-[#0C0C0C]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        {features.map(({ title, subtitle, icon: Icon }, index) => (
          <article
            key={title}
            className={`flex min-h-[78px] min-w-0 items-center gap-3 px-3 py-4 sm:px-5 max-md:gap-2 max-md:px-2 ${index % 2 === 1 ? "border-l border-white/[0.06]" : ""} ${index > 1 ? "border-t border-white/[0.06] lg:border-t-0" : ""} ${index > 0 ? "lg:border-l lg:border-white/[0.06]" : ""}`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#111111] max-md:h-9 max-md:w-9">
              <Icon className="h-5 w-5 text-[var(--brand-color)]" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <p className="font-display break-words text-[10px] font-bold leading-4 text-white sm:text-[11px]">{title}</p>
              <p className="break-words text-[9px] leading-4 text-white/45 sm:text-[10px] max-md:text-[10px]">{subtitle}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
