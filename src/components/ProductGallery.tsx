"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

type ProductGalleryProps = {
  images: string[];
  productName: string;
};

export default function ProductGallery({
  images,
  productName,
}: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(images[0]);
  const thumbsRef = useRef<HTMLDivElement | null>(null);

  const scrollThumbs = (direction: 1 | -1) => {
    const el = thumbsRef.current;
    if (!el) return;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    el.scrollBy({
      left: desktop ? 0 : direction * 140,
      top: desktop ? direction * 140 : 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-[78px_minmax(0,1fr)] lg:gap-4">
      <div className="order-2 flex min-w-0 items-center gap-2 lg:order-1 lg:flex-col">
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => scrollThumbs(-1)}
            aria-label="Ver fotos anteriores"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-[#101010] text-white/65 transition hover:border-[#A9EC17] hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] lg:h-8 lg:w-full"
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
              onClick={() => setSelectedImage(image)}
              aria-label={`Ver foto ${index + 1} de ${productName}`}
              aria-pressed={selectedImage === image}
              className={`relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-lg border bg-[#F4F4F4] transition duration-[250ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] motion-reduce:transform-none motion-reduce:transition-none lg:h-[78px] lg:w-full ${selectedImage === image ? "border-[#A9EC17] shadow-[0_0_20px_rgba(169,236,23,0.12)]" : "border-white/10 opacity-70 hover:border-[#A9EC17]/40 hover:opacity-100"}`}
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
            onClick={() => scrollThumbs(1)}
            aria-label="Ver mais fotos"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-[#101010] text-white/65 transition hover:border-[#A9EC17] hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] lg:h-8 lg:w-full"
          >
            <ChevronRight className="h-4 w-4 lg:hidden" />
            <ChevronDown className="hidden h-4 w-4 lg:block" />
          </button>
        )}
      </div>

      <div className="relative order-1 aspect-square overflow-hidden rounded-xl border border-white/[0.1] bg-[#F4F4F4] shadow-[0_24px_70px_rgba(0,0,0,0.32)] lg:order-2 lg:aspect-[1.03/1]">
        <Image
          src={selectedImage}
          alt={productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 52vw"
          className="object-contain"
        />
      </div>
    </div>
  );
}
