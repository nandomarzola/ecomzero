import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, HandHeart, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre a EcomZero",
  description: "Conheça a proposta e os compromissos da EcomZero.",
};

const commitments = [
  {
    icon: Sparkles,
    title: "Curadoria útil",
    text: "Selecionamos produtos pensados para resolver necessidades reais da rotina.",
  },
  {
    icon: BadgeCheck,
    title: "Preço transparente",
    text: "Você confere produto, quantidade, desconto e frete antes de finalizar o pedido.",
  },
  {
    icon: ShieldCheck,
    title: "Compra protegida",
    text: "O pagamento é processado em ambiente seguro pelo Mercado Pago.",
  },
  {
    icon: HandHeart,
    title: "Atendimento próximo",
    text: "Nossa equipe acompanha cada etapa, da compra à entrega.",
  },
];

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <header className="max-w-2xl">
          <span className="mb-3 block h-0.5 w-11 bg-[var(--brand-color)]" />
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-color)]">
            Sobre a EcomZero
          </p>
          <h1 className="font-display mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Produtos úteis para deixar a rotina mais simples
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/60 sm:text-base">
            A EcomZero nasceu para reunir soluções práticas em um catálogo
            direto, com informação clara e uma experiência de compra segura.
            Nosso foco é ajudar você a encontrar o que precisa sem complicação.
          </p>
        </header>

        <section
          aria-label="Compromissos da EcomZero"
          className="mt-10 grid gap-4 sm:grid-cols-2"
        >
          {commitments.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-color)]/10 text-[var(--brand-color)]">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <h2 className="font-display mt-4 text-base font-bold text-white">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/55">{text}</p>
            </article>
          ))}
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/produtos"
            className="store-primary-action font-display inline-flex min-h-11 items-center justify-center px-5 text-xs font-bold uppercase"
          >
            Ver produtos
          </Link>
          <Link
            href="/como-comprar"
            className="font-display inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 px-5 text-xs font-bold uppercase text-white transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)]"
          >
            Como comprar
          </Link>
        </div>
      </main>
    </div>
  );
}
