"use client";

import { useState } from "react";
import Image from "next/image";

type ProductGalleryProps = {
  images: string[];
  productName: string;
};

export default function ProductGallery({
  images,
  productName,
}: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(images[0]);

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-[#491010] bg-[radial-gradient(circle_at_50%_55%,#310909,#0A0101_64%,#030000)] shadow-[0_24px_80px_rgba(66,0,0,0.24)]">
        <Image
          src={selectedImage}
          alt={productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 52vw"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_65%,rgba(0,0,0,0.24))]" />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] sm:mt-5 sm:gap-3 [&::-webkit-scrollbar]:hidden">
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setSelectedImage(image)}
            aria-label={`Ver foto ${index + 1} de ${productName}`}
            aria-pressed={selectedImage === image}
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-[#0A0101] transition sm:h-28 sm:w-28 sm:rounded-xl ${selectedImage === image ? "border-[#A9EC17] shadow-[0_0_20px_rgba(169,236,23,0.12)]" : "border-[#491010] opacity-70 hover:opacity-100"}`}
          >
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 640px) 64px, 112px"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
