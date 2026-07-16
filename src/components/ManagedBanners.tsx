"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import type { StoreBanner } from "@/lib/services/storeContentService";

function BannerImage({ banner, priority = false }: { banner: StoreBanner; priority?: boolean }) {
  const image = <Image src={banner.imagemUrl} alt={banner.altText} fill priority={priority} sizes="(max-width: 1440px) 100vw, 1440px" className="object-cover" />;
  return banner.linkUrl ? <Link href={banner.linkUrl} className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--brand-color)]">{image}</Link> : image;
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
    const timer = window.setInterval(() => emblaApi.scrollNext(), 6000);
    return () => window.clearInterval(timer);
  }, [banners.length, emblaApi, paused]);
  if (banners.length === 0) return null;
  return <section className="relative border-b border-white/[0.06] bg-black" aria-label="Destaques" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
    <div ref={emblaRef} className="overflow-hidden"><div className="flex">{banners.map((banner, index) => <article key={banner.id} className="relative aspect-[18/7] min-w-0 flex-[0_0_100%]" aria-label={`${index + 1} de ${banners.length}`}><BannerImage banner={banner} priority={index === 0} /></article>)}</div></div>
    {banners.length > 1 ? <><button type="button" onClick={() => emblaApi?.scrollPrev()} aria-label="Banner anterior" className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] md:flex"><ChevronLeft className="h-5 w-5" /></button><button type="button" onClick={() => emblaApi?.scrollNext()} aria-label="Próximo banner" className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] md:flex"><ChevronRight className="h-5 w-5" /></button><div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">{banners.map((banner, index) => <button key={banner.id} type="button" onClick={() => emblaApi?.scrollTo(index)} aria-label={`Ir para banner ${index + 1}`} className={`h-1.5 rounded-full transition-all ${selected === index ? "w-7 bg-[var(--brand-color)]" : "w-2 bg-white/60"}`} />)}</div></> : null}
  </section>;
}

export function ManagedBannerSection({ banners, position }: { banners: StoreBanner[]; position: "home_middle" | "home_bottom" }) {
  if (banners.length === 0) return null;
  return <section className="mx-auto grid max-w-[1440px] gap-4 px-4 pb-6 sm:px-6 lg:px-10">{banners.map((banner) => <article key={banner.id} className={`relative overflow-hidden rounded-xl border border-white/[0.08] ${position === "home_middle" ? "aspect-[15/4]" : "aspect-[60/13]"}`}><BannerImage banner={banner} /></article>)}</section>;
}
