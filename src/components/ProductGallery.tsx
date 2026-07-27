"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Maximize2,
  X,
} from "lucide-react";

type ProductGalleryProps = {
  images: string[];
  productName: string;
};

export default function ProductGallery({
  images,
  productName,
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const thumbsRef = useRef<HTMLDivElement | null>(null);
  const mainImageButtonRef = useRef<HTMLButtonElement | null>(null);
  const selectedImage = images[selectedIndex] ?? images[0];

  const selectRelativeImage = useCallback((direction: 1 | -1) => {
    if (images.length < 2) return;
    setSelectedIndex((current) => {
      const next = (current + direction + images.length) % images.length;
      const thumb = thumbsRef.current?.querySelector<HTMLElement>(
        `[data-gallery-index="${next}"]`,
      );
      thumb?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "nearest",
        inline: "nearest",
      });
      return next;
    });
  }, [images.length]);

  useEffect(() => {
    if (!isExpanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      } else if (event.key === "ArrowLeft") {
        selectRelativeImage(-1);
      } else if (event.key === "ArrowRight") {
        selectRelativeImage(1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded, selectRelativeImage]);

  const closeExpandedGallery = () => {
    setIsExpanded(false);
    window.requestAnimationFrame(() => mainImageButtonRef.current?.focus());
  };

  return (
    <>
      <div className="grid min-w-0 gap-3 lg:grid-cols-[78px_minmax(0,1fr)] lg:gap-4">
        <div className="order-2 flex min-w-0 items-center gap-2 lg:order-1 lg:flex-col">
          {images.length > 1 && (
            <button
              type="button"
              onClick={() => selectRelativeImage(-1)}
              aria-label="Ver foto anterior"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-[#101010] text-white/65 transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] lg:h-8 lg:w-full"
            >
              <ChevronLeft className="h-4 w-4 lg:hidden" />
              <ChevronUp className="hidden h-4 w-4 lg:block" />
            </button>
          )}

          <div
            ref={thumbsRef}
            className="flex min-w-0 flex-1 gap-2 overflow-auto [scrollbar-width:none] lg:w-full lg:flex-col [&::-webkit-scrollbar]:hidden"
          >
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                data-gallery-index={index}
                onClick={() => setSelectedIndex(index)}
                aria-label={`Ver foto ${index + 1} de ${productName}`}
                aria-pressed={selectedIndex === index}
                className={`relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-lg border bg-[#F4F4F4] transition duration-[250ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] motion-reduce:transform-none motion-reduce:transition-none lg:h-[78px] lg:w-full ${selectedIndex === index ? "border-[var(--brand-color)] shadow-[0_0_20px_rgba(169,236,23,0.12)]" : "border-white/10 opacity-70 hover:border-[var(--brand-color)]/40 hover:opacity-100"}`}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="78px"
                  className="object-contain"
                />
              </button>
            ))}
          </div>

          {images.length > 1 && (
            <button
              type="button"
              onClick={() => selectRelativeImage(1)}
              aria-label="Ver próxima foto"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-[#101010] text-white/65 transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] lg:h-8 lg:w-full"
            >
              <ChevronRight className="h-4 w-4 lg:hidden" />
              <ChevronDown className="hidden h-4 w-4 lg:block" />
            </button>
          )}
        </div>

        <button
          ref={mainImageButtonRef}
          type="button"
          onClick={() => setIsExpanded(true)}
          aria-label={`Ampliar foto ${selectedIndex + 1} de ${productName}`}
          className="group relative order-1 aspect-square overflow-hidden rounded-xl border border-white/[0.1] bg-[#F4F4F4] shadow-[0_24px_70px_rgba(0,0,0,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] lg:order-2 lg:aspect-[1.03/1]"
        >
          <Image
            src={selectedImage}
            alt={productName}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 52vw"
            className="object-contain transition duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
          />
          <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur transition group-hover:bg-black/80">
            <Maximize2 className="h-4 w-4" />
          </span>
        </button>
      </div>

      {isExpanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Galeria ampliada de ${productName}`}
          onClick={closeExpandedGallery}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm sm:p-8"
        >
          <button
            type="button"
            autoFocus
            onClick={closeExpandedGallery}
            aria-label="Fechar galeria ampliada"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] sm:right-8 sm:top-8"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            onClick={(event) => event.stopPropagation()}
            className="relative h-[min(82vh,900px)] w-[min(88vw,1100px)]"
          >
            <Image
              src={selectedImage}
              alt={`${productName}, foto ${selectedIndex + 1}`}
              fill
              sizes="90vw"
              className="object-contain"
              priority
            />
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  selectRelativeImage(-1);
                }}
                aria-label="Ver foto anterior"
                className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] sm:left-8"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  selectRelativeImage(1);
                }}
                aria-label="Ver próxima foto"
                className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] sm:right-8"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white/75 sm:bottom-8">
                {selectedIndex + 1} / {images.length}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
