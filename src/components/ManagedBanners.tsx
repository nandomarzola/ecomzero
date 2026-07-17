"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import type { StoreBanner } from "@/lib/services/storeContentService";

function BannerImage({
  banner,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1280px) calc(100vw - 40px), 1280px",
}: {
  banner: StoreBanner;
  priority?: boolean;
  sizes?: string;
}) {
  const image = (
    <Image
      src={banner.imagemUrl}
      alt={banner.altText}
      fill
      priority={priority}
      quality={100}
      sizes={sizes}
      className="object-cover object-center"
    />
  );

  return banner.linkUrl ? (
    <Link
      href={banner.linkUrl}
      className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--brand-color)]"
    >
      {image}
    </Link>
  ) : image;
}

export function ManagedHero({ banners }: { banners: StoreBanner[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: banners.length > 1, duration: 30 });
  const [paused, setPaused] = useState(false);
  const subscribe = useCallback((notify: () => void) => {
    if (!emblaApi) return () => {};
    emblaApi.on("select", notify); emblaApi.on("reInit", notify);
    return () => { emblaApi.off("select", notify); emblaApi.off("reInit", notify); };
  }, [emblaApi]);
  const selected = useSyncExternalStore(subscribe, () => emblaApi?.selectedScrollSnap() ?? 0, () => 0);
  useEffect(() => {
    if (!emblaApi || paused || banners.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => emblaApi.scrollNext(), 5000);
    return () => window.clearInterval(timer);
  }, [banners.length, emblaApi, paused]);
  if (banners.length === 0) return null;
  return (
    <section
      className="border-b border-white/[0.06] bg-[#050505] py-3 sm:px-5 sm:py-5"
      aria-label="Destaques"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="group relative mx-auto max-w-[1280px] overflow-hidden sm:rounded-2xl sm:border sm:border-white/[0.08]">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {banners.map((banner, index) => (
              <article
                key={banner.id}
                className="relative h-[190px] min-w-0 flex-[0_0_100%] sm:h-[260px] md:h-[340px] lg:h-[420px] xl:h-[480px]"
                aria-label={`${index + 1} de ${banners.length}`}
              >
                <BannerImage banner={banner} priority={index === 0} />
              </article>
            ))}
          </div>
        </div>

        {banners.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              aria-label="Banner anterior"
              className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] focus-visible:opacity-100 md:left-4 md:h-11 md:w-11 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              aria-label="Próximo banner"
              className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] focus-visible:opacity-100 md:right-4 md:h-11 md:w-11 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => emblaApi?.scrollTo(index)}
                  aria-label={`Ir para banner ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all ${selected === index ? "w-7 bg-[var(--brand-color)]" : "w-2 bg-white/60"}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

export function ManagedBannerSection({ banners, position }: { banners: StoreBanner[]; position: "home_middle" | "home_bottom" }) {
  if (banners.length === 0) return null;
  const isBottom = position === "home_bottom";
  // Faixa intermediária: 1 banner retangular full-width.
  // Faixa inferior é um PAR de quadrados lado a lado que forma 1 banner único —
  // usa só os 2 primeiros por ordem (3º+ são ignorados aqui). Com 1 só cadastrado,
  // mostra em LARGURA TOTAL (não meia largura, que ficaria esquisito). Os avisos
  // no admin ("cadastre mais 1 para completar o par" / "excedentes não exibidos")
  // ficam a cargo do admin de Banners (Codex).
  const items = isBottom ? banners.slice(0, 2) : banners;
  const bottomPair = isBottom && items.length >= 2;
  return (
    <section className={`mx-auto grid max-w-[1440px] px-4 pb-6 sm:px-6 lg:px-10 ${bottomPair ? "grid-cols-2 gap-3" : "gap-4"}`}>
      {items.map((banner) => (
        <article
          key={banner.id}
          className={`relative overflow-hidden rounded-xl border border-white/[0.08] ${
            !isBottom ? "aspect-[1920/819]" : bottomPair ? "aspect-square" : "aspect-[2/1]"
          }`}
        >
          <BannerImage
            banner={banner}
            sizes={bottomPair ? "(max-width: 1440px) 50vw, 720px" : "(max-width: 1440px) 100vw, 1440px"}
          />
        </article>
      ))}
    </section>
  );
}
