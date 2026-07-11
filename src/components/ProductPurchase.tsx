"use client";

import { useState } from "react";

type Variant = {
  id: string;
  label: string;
  precoDe: number;
  precoPor: number;
};

type ProductPurchaseProps = {
  variants: Variant[];
  shopeeUrl: string;
};

const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function ProductPurchase({
  variants,
  shopeeUrl,
}: ProductPurchaseProps) {
  const [selectedId, setSelectedId] = useState(variants[0].id);
  const selectedVariant =
    variants.find((variant) => variant.id === selectedId) ?? variants[0];
  const hasDiscount = selectedVariant.precoDe > selectedVariant.precoPor;

  const handlePurchase = () => {
    window.open(shopeeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mt-4">
      <fieldset>
        <legend className="font-display text-sm font-bold text-[#FFF8ED]">
          Escolha o kit
        </legend>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          {variants.map((variant) => {
            const isSelected = variant.id === selectedId;

            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedId(variant.id)}
                aria-pressed={isSelected}
                className={`font-display min-h-12 rounded-xl border px-2 py-3 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8E82E] sm:px-4 sm:text-sm ${
                  isSelected
                    ? "border-[#B8E82E] bg-[#B8E82E] text-[#2A0A0A]"
                    : "border-white/20 bg-[#2A0A0A] text-[#F2DFD2] hover:border-[#B8E82E]/70"
                }`}
              >
                {variant.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div
        className="mt-3 rounded-xl border border-white/10 bg-[#2A0A0A] px-5 py-3"
        aria-live="polite"
      >
        {hasDiscount && (
          <p className="text-sm leading-5 text-[#BDAAAA]">
            De <span className="line-through">{formatPrice(selectedVariant.precoDe)}</span>
          </p>
        )}
        <p className="font-display mt-1 whitespace-nowrap text-[32px] font-bold leading-[1.12] text-[#B8E82E] sm:text-[38px]">
          Por {formatPrice(selectedVariant.precoPor)}
        </p>
      </div>

      <button
        type="button"
        onClick={handlePurchase}
        className="font-display mt-3 flex min-h-14 w-full items-center justify-center rounded-xl bg-[#B8E82E] px-6 py-4 text-base font-bold uppercase tracking-[0.5px] text-[#2A0A0A] shadow-lg shadow-black/20 transition hover:scale-[1.02] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B8E82E]"
      >
        Comprar agora
      </button>

      <p className="mt-2 flex items-center justify-center gap-2 text-center text-xs leading-5 text-[#E6D5CA]">
        <span className="font-bold text-[#B8E82E]">✓</span>
        Vendido e entregue pela loja ECOMZERO na Shopee
      </p>
    </div>
  );
}
