"use client";

import type { FormEvent } from "react";
import { Mail } from "lucide-react";

export default function NewsletterBanner() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6 lg:px-10">
      <div className="flex flex-col gap-5 rounded-xl border border-white/[0.08] bg-[#101010] px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="flex items-center gap-4">
          <Mail className="h-9 w-9 shrink-0 text-[var(--brand-color)] sm:h-11 sm:w-11" strokeWidth={1.4} />
          <div>
            <h2 className="font-display text-sm font-bold uppercase text-white sm:text-base">
              Receba ofertas exclusivas
            </h2>
            <p className="mt-1 text-[11px] text-white/50 sm:text-xs">
              Cadastre seu e-mail e receba promoções imperdíveis.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_150px] lg:max-w-[620px]"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Seu melhor e-mail
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Seu melhor e-mail"
            className="h-11 min-w-0 rounded-md border border-white/20 bg-[#0B0B0B] px-4 text-xs text-white outline-none transition placeholder:text-white/35 focus:border-[var(--brand-color)] focus:ring-1 focus:ring-[var(--brand-color)]"
          />
          <button
            type="submit"
            className="font-display h-11 rounded-md bg-[var(--brand-color)] px-6 text-[10px] font-extrabold uppercase text-black transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Cadastrar
          </button>
        </form>
      </div>
    </section>
  );
}
