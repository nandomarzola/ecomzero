import Link from "next/link";
import {
  BadgeDollarSign,
  BadgeCheck,
  Headphones,
  ShieldCheck,
} from "lucide-react";

const benefits = [
  { icon: BadgeCheck, title: "Qualidade", description: "Selecionada" },
  { icon: BadgeDollarSign, title: "Preço justo", description: "Sempre" },
  { icon: ShieldCheck, title: "Compra segura", description: "100% protegida" },
  { icon: Headphones, title: "Atendimento", description: "Humanizado" },
];

export default function HomeInstitutional() {
  return (
    <section
      id="sobre"
      className="mx-auto max-w-[1440px] scroll-mt-28 px-4 pb-4 sm:px-6 lg:px-10"
    >
      <div className="grid overflow-hidden rounded-xl border border-white/[0.08] bg-[#101010] lg:grid-cols-[1.15fr_1.85fr]">
        <div className="flex items-center gap-5 p-6 sm:p-8 lg:border-r lg:border-white/[0.08] lg:p-10">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#A9EC17]/[0.08] ring-1 ring-[#A9EC17]/20 sm:h-24 sm:w-24">
            <ShieldCheck className="h-11 w-11 text-[#A9EC17] sm:h-14 sm:w-14" strokeWidth={1.4} />
          </div>
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-wider text-[#A9EC17]">
              Sobre a EcomZero
            </p>
            <h2 className="font-display mt-2 max-w-sm text-xl font-bold leading-tight text-white sm:text-2xl">
              Selecionamos produtos úteis. Nada de bugigangas.
            </h2>
            <p className="mt-2 text-xs text-white/50 sm:text-sm">
              Só o que realmente facilita sua vida.
            </p>
            <Link
              href="/#sobre"
              className="font-display mt-5 inline-flex min-h-10 items-center justify-center rounded-md border border-white/20 px-4 text-[10px] font-bold uppercase text-white transition hover:border-[#A9EC17] hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17]"
            >
              Conheça nossa história
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-white/[0.08] lg:grid-cols-4 lg:border-t-0">
          {benefits.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              className={`flex flex-col items-center justify-center px-4 py-7 text-center sm:py-9 ${index % 2 === 0 ? "border-r border-white/[0.08]" : ""} ${index < 2 ? "border-b border-white/[0.08] lg:border-b-0" : ""} ${index > 0 ? "lg:border-l lg:border-white/[0.08]" : "lg:border-r-0"}`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#A9EC17]/[0.07] text-[#A9EC17]">
                <Icon className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <strong className="font-display mt-4 text-xs font-bold text-white sm:text-sm">
                {title}
              </strong>
              <span className="mt-1 text-[10px] text-white/45 sm:text-[11px]">
                {description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
