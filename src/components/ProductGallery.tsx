"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    el.scrollBy({
      left: direction * 140,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <div className="min-w-0">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-white/[0.08] bg-[radial-gradient(circle_at_50%_52%,#1B1B1B_0%,#101010_56%,#0A0A0A_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.28)] lg:aspect-[1.08/1]">
        <Image
          src={selectedImage}
          alt={productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 52vw"
          className="object-contain"
        />
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex items-center gap-2 sm:mt-5 lg:gap-6">
          <button
            type="button"
            onClick={() => scrollThumbs(-1)}
            aria-label="Ver fotos anteriores"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#0D0D0D] text-white/75 transition duration-[250ms] hover:-translate-y-0.5 hover:border-[#A9EC17] hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] motion-reduce:transform-none motion-reduce:transition-none lg:h-12 lg:w-12"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={thumbsRef}
            className="flex flex-1 gap-2 overflow-x-auto pb-2 [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden"
          >
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setSelectedImage(image)}
                aria-label={`Ver foto ${index + 1} de ${productName}`}
                aria-pressed={selectedImage === image}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-[#0D0D0D] transition duration-[250ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] motion-reduce:transform-none motion-reduce:transition-none sm:h-24 sm:w-24 sm:rounded-xl lg:h-[108px] lg:w-[108px] ${selectedImage === image ? "border-[#A9EC17] shadow-[0_0_22px_rgba(169,236,23,0.1)]" : "border-white/10 opacity-75 hover:-translate-y-0.5 hover:border-[#A9EC17]/30 hover:opacity-100"}`}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 64px, 112px"
                  className="object-contain"
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollThumbs(1)}
            aria-label="Ver mais fotos"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#0D0D0D] text-white/75 transition duration-[250ms] hover:-translate-y-0.5 hover:border-[#A9EC17] hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] motion-reduce:transform-none motion-reduce:transition-none lg:h-12 lg:w-12"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
