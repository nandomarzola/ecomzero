"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

type Slide = {
  id: string;
  eyebrow: string;
  titulo: string;
  destaque: string;
  subtitulo: string;
  imagem: string;
  href: string;
};

type HeroShowcaseProps = {
  slides: Slide[];
};

const benefits = [
  { title: "Frete rápido", detail: "para todo o Brasil", icon: Truck },
  { title: "Compra segura", detail: "dados protegidos", icon: ShieldCheck },
  { title: "Troca fácil", detail: "em até 7 dias", icon: RefreshCw },
  { title: "Qualidade", detail: "selecionada", icon: BadgeCheck },
];

export default function HeroShowcase({ slides }: HeroShowcaseProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 32 });
  const [paused, setPaused] = useState(false);

  const subscribeToEmbla = useCallback(
    (onStoreChange: () => void) => {
      if (!emblaApi) return () => {};
      emblaApi.on("select", onStoreChange);
      emblaApi.on("reInit", onStoreChange);
      return () => {
        emblaApi.off("select", onStoreChange);
        emblaApi.off("reInit", onStoreChange);
      };
    },
    [emblaApi],
  );

  const selectedIndex = useSyncExternalStore(
    subscribeToEmbla,
    () => emblaApi?.selectedScrollSnap() ?? 0,
    () => 0,
  );

  useEffect(() => {
    if (!emblaApi || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => emblaApi.scrollNext(), 6000);
    return () => window.clearInterval(timer);
  }, [emblaApi, paused]);

  return (
    <section
      className="relative overflow-hidden border-b border-white/[0.06] bg-black"
      aria-roledescription="carrossel"
      aria-label="Produtos em destaque"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex touch-pan-y">
          {slides.map((slide, slideIndex) => {
            const TitleTag = slideIndex === 0 ? "h1" : "h2";
            const isPrimary = slide.id === "sensor-alarme";
            const imageSrc = isPrimary
              ? "/images/hero-sensor-cutout.png"
              : slide.imagem;

            return (
              <article
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${slideIndex + 1} de ${slides.length}`}
                className="relative min-w-0 flex-[0_0_100%] overflow-hidden"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_48%,rgba(169,236,23,0.10),transparent_28%),linear-gradient(100deg,#000_0%,#020402_56%,#000_100%)]" />

                <div className="relative mx-auto grid min-h-[540px] max-w-[1440px] items-center gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[44%_56%] lg:px-8 lg:py-0">
                  <div className="relative z-10 max-w-[590px]">
                    <p className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--brand-color)] sm:text-xs">
                      {isPrimary ? "Tecnologia e praticidade" : slide.eyebrow}
                    </p>

                    <TitleTag className="font-display mt-3 text-[38px] font-extrabold uppercase leading-[1.02] text-white sm:text-5xl lg:text-[58px]">
                      {isPrimary ? "Para facilitar" : slide.titulo}
                      <span className="mt-1 block text-[var(--brand-color)]">
                        {isPrimary ? "seu dia a dia." : slide.destaque}
                      </span>
                    </TitleTag>

                    <p className="mt-4 max-w-[430px] text-sm leading-6 text-white/65 sm:text-base">
                      {isPrimary
                        ? "Produtos inteligentes, úteis e de qualidade para transformar sua rotina."
                        : slide.subtitulo}
                    </p>

                    <Link
                      href={isPrimary ? "/#vitrine" : slide.href}
                      className="store-primary-action font-display mt-6 inline-flex h-12 items-center justify-center gap-3 px-7 text-xs font-extrabold uppercase transition duration-[250ms] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(169,236,23,0.14)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand-color)] motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      {isPrimary ? "Ver todos os produtos" : "Ver produto"}
                      <ArrowRight className="h-4 w-4" strokeWidth={2} />
                    </Link>

                    <div className="mt-8 grid max-w-[600px] grid-cols-2 overflow-hidden rounded-lg border border-white/[0.08] bg-[#0B0B0B]/80 sm:grid-cols-4">
                      {benefits.map(({ title, detail, icon: Icon }, index) => (
                        <div
                          key={title}
                          className={`flex min-h-[66px] items-center gap-2 px-3 py-3 ${index % 2 === 1 ? "border-l border-white/[0.08]" : ""} ${index > 1 ? "border-t border-white/[0.08] sm:border-t-0" : ""} ${index > 0 ? "sm:border-l sm:border-white/[0.08]" : ""}`}
                        >
                          <Icon className="h-5 w-5 shrink-0 text-[var(--brand-color)]" strokeWidth={1.7} />
                          <p className="text-[9px] leading-3.5 text-white">
                            <span className="block font-semibold">{title}</span>
                            <span className="text-white/45">{detail}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative h-[310px] min-w-0 sm:h-[390px] lg:h-[540px]">
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-[var(--brand-color)]/55 shadow-[0_0_60px_rgba(169,236,23,0.16),inset_0_0_70px_rgba(169,236,23,0.08)]" />
                    <div className="pointer-events-none absolute bottom-[7%] left-1/2 h-[18%] w-[78%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,#333_0%,#171717_48%,#050505_72%)] shadow-[0_28px_55px_rgba(0,0,0,0.7)]" />

                    <Image
                      src={imageSrc}
                      alt={isPrimary ? "Sensor Alarme Magnético para portas e janelas" : slide.titulo}
                      fill
                      priority={slideIndex === 0}
                      sizes="(max-width: 1024px) 100vw, 56vw"
                      className={`relative z-[1] object-contain transition-transform duration-500 motion-reduce:transition-none ${isPrimary ? "p-3 sm:p-5 lg:p-8" : "rounded-2xl p-8 lg:p-16"}`}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => emblaApi?.scrollPrev()}
        aria-label="Banner anterior"
        className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/75 transition hover:border-[var(--brand-color)]/50 hover:text-[var(--brand-color)] lg:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => emblaApi?.scrollNext()}
        aria-label="Próximo banner"
        className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/75 transition hover:border-[var(--brand-color)]/50 hover:text-[var(--brand-color)] lg:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => emblaApi?.scrollTo(index)}
            aria-label={`Ir para o banner ${index + 1}`}
            aria-current={selectedIndex === index}
            className="flex min-h-6 min-w-6 items-center justify-center p-1.5"
          >
            <span
              aria-hidden="true"
              className={`h-1.5 rounded-full transition-all ${selectedIndex === index ? "w-6 bg-[var(--brand-color)]" : "w-1.5 bg-white/75"}`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
