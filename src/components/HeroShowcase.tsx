"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  Feather,
  Lightbulb,
  Magnet,
} from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import BrandLogo from "@/components/BrandLogo";

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

const details = [
  { label: "FIXAÇÃO MAGNÉTICA", icon: Magnet },
  { label: "LED DE ALTA POTÊNCIA", icon: Lightbulb },
  { label: "RECARREGÁVEL VIA USB", icon: BatteryCharging },
  { label: "PORTÁTIL E LEVE", icon: Feather },
];

export default function HeroShowcase({ slides }: HeroShowcaseProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 32 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const updateSelectedIndex = useCallback(() => {
    if (emblaApi) {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    }
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    updateSelectedIndex();
    emblaApi.on("select", updateSelectedIndex);
    return () => {
      emblaApi.off("select", updateSelectedIndex);
    };
  }, [emblaApi, updateSelectedIndex]);

  useEffect(() => {
    if (!emblaApi || paused) {
      return;
    }

    // Respeita usuários que preferem menos movimento (a11y / Lighthouse)
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setInterval(() => emblaApi.scrollNext(), 6000);
    return () => window.clearInterval(timer);
  }, [emblaApi, paused]);

  return (
    <section
      className="relative overflow-hidden bg-[#050000]"
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

            return (
            <article
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} de ${slides.length}`}
              className="relative min-w-0 flex-[0_0_100%] overflow-hidden bg-[radial-gradient(circle_at_80%_50%,#3B0707_0%,#160202_42%,#050000_76%)]"
            >
              <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle,#8B1111_1px,transparent_1px)] [background-position:0_0] [background-size:14px_14px] [mask-image:linear-gradient(90deg,black,transparent_30%)]" />
              <div className="absolute inset-y-0 right-0 w-full opacity-70 sm:w-[62%] lg:w-[58%]">
                <Image
                  src={slide.imagem}
                  alt=""
                  fill
                  priority={slide.id === slides[0]?.id}
                  sizes="(max-width: 640px) 100vw, 60vw"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#050000_0%,rgba(5,0,0,0.92)_10%,rgba(5,0,0,0.28)_58%,rgba(5,0,0,0.15)_100%)] sm:block" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,0,0,0.55)_0%,rgba(5,0,0,0.78)_55%,#050000_100%)] sm:hidden" />
              </div>

              <div className="relative mx-auto flex min-h-[590px] max-w-[1440px] items-center px-8 py-14 sm:px-16 lg:px-24">
                <div className="relative z-10 min-w-0 w-full max-w-[620px]">
                  <BrandLogo className="mb-3 scale-110 origin-left" />
                  <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-[#A9EC17]">
                    {slide.eyebrow}
                  </p>
                  <TitleTag className="font-display mt-3 text-4xl font-extrabold leading-[0.98] text-white sm:text-5xl lg:text-6xl">
                    {slide.titulo}
                    <span className="mt-2 block text-[#A9EC17]">{slide.destaque}</span>
                  </TitleTag>
                  <p className="font-display mt-4 inline-flex rounded-lg border border-[#8C1111] bg-[#7B0D0D]/70 px-4 py-2 text-sm font-bold tracking-wide text-white sm:text-base">
                    {slide.subtitulo}
                  </p>

                  <div className="mt-5 grid w-full max-w-full grid-cols-2 overflow-hidden rounded-xl border border-[#771010] bg-black/45 sm:max-w-[600px] sm:grid-cols-4">
                    {details.map(({ label, icon: Icon }, index) => (
                      <div
                        key={label}
                        className={`flex min-h-24 min-w-0 flex-col items-center justify-center gap-2 px-2 py-3 text-center ${index > 0 ? "border-l border-[#771010]" : ""}`}
                      >
                        <Icon className="h-7 w-7 text-[#A9EC17]" strokeWidth={1.6} />
                        <span className="max-w-full break-words text-[9px] font-semibold leading-4 text-white sm:text-[11px]">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={slide.href}
                    className="font-display mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#A9EC17] px-7 py-3 text-sm font-bold text-black transition hover:brightness-110"
                  >
                    VER PRODUTO
                  </Link>
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
        className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[#A9EC17] transition hover:bg-black/45 sm:left-5"
      >
        <ArrowLeft className="h-8 w-8" strokeWidth={1.8} />
      </button>
      <button
        type="button"
        onClick={() => emblaApi?.scrollNext()}
        aria-label="Próximo banner"
        className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[#A9EC17] transition hover:bg-black/45 sm:right-5"
      >
        <ArrowRight className="h-8 w-8" strokeWidth={1.8} />
      </button>

      <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2">
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
              className={`h-2.5 rounded-full transition-all ${selectedIndex === index ? "w-7 bg-[#A9EC17]" : "w-2.5 bg-white"}`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
