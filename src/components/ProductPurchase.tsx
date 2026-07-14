"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Handshake,
  Minus,
  Music2,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { useCartCount } from "@/components/CartProvider";
import ShippingCalculator from "@/components/ShippingCalculator";
import { addToCartAction } from "@/lib/actions/cartActions";
import type { ProductVariant } from "@/types/product";

type ProductPurchaseProps = {
  variants: ProductVariant[];
  fallbackShopeeUrl: string;
};

type PurchaseFeedback =
  | { type: "idle" }
  | { type: "added" }
  | { type: "error"; message: string };

const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function ProductPurchase({
  variants,
  fallbackShopeeUrl,
}: ProductPurchaseProps) {
  const [selectedId, setSelectedId] = useState(variants[0].id);
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<PurchaseFeedback>({ type: "idle" });
  const { refreshCartCount } = useCartCount();

  const selectedVariant =
    variants.find((variant) => variant.id === selectedId) ?? variants[0];
  const hasDiscount = selectedVariant.precoDe > selectedVariant.precoPor;
  const shopeeUrl = selectedVariant.linkShopee ?? fallbackShopeeUrl;

  const handleSelectVariant = (variantId: string) => {
    setSelectedId(variantId);
    setQuantity(1);
    setFeedback({ type: "idle" });
  };

  useEffect(() => {
    if (feedback.type !== "added") return;
    const timer = window.setTimeout(() => setFeedback({ type: "idle" }), 2500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const handleAddToCart = () => {
    startTransition(async () => {
      const result = await addToCartAction({
        variantId: selectedVariant.id,
        quantidade: quantity,
      });
      if (result.success) {
        setFeedback({ type: "added" });
        refreshCartCount();
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  };

  const handleBuyOnShopee = () => {
    window.open(shopeeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mt-5">
      {variants.length > 1 && (
        <fieldset>
          <legend className="font-display text-[11px] font-bold uppercase tracking-wide text-white/75">
            Escolha a opção
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {variants.map((variant) => {
              const isSelected = variant.id === selectedId;

              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => handleSelectVariant(variant.id)}
                  aria-pressed={isSelected}
                  className={`font-display min-h-11 rounded-lg border px-3 py-2 text-[10px] font-bold transition duration-[250ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] motion-reduce:transform-none motion-reduce:transition-none ${
                    isSelected
                      ? "border-[#A9EC17] bg-[#A9EC17] text-black"
                      : "border-white/10 bg-[#0D0D0D] text-white/65 hover:-translate-y-0.5 hover:border-[#A9EC17]/35 hover:text-white"
                  }`}
                >
                  {variant.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <section
        aria-labelledby="ecomzero-purchase-title"
        className={`${variants.length > 1 ? "mt-4" : ""} overflow-hidden rounded-xl border border-white/[0.09] bg-[#0D0D0D] shadow-[0_18px_50px_rgba(0,0,0,0.2)]`}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A9EC17]/[0.08]">
            <ShieldCheck className="h-6 w-6 text-[#A9EC17]" strokeWidth={1.7} />
          </span>
          <div>
            <h2
              id="ecomzero-purchase-title"
              className="font-display text-xs font-bold uppercase text-white"
            >
              Compre na EcomZero
            </h2>
            <p className="mt-0.5 text-[10px] text-white/45 sm:text-[11px]">
              Adicione ao carrinho e escolha a quantidade desejada.
            </p>
          </div>
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-[0.88fr_1.12fr] sm:p-4">
          <div className="flex flex-col rounded-lg border border-white/[0.08] bg-[#111111] p-4">
            <p className="text-[11px] font-medium text-white/65">Quantidade</p>
            <div className="mt-2 flex h-10 w-[138px] items-center justify-between rounded-md border border-white/15 bg-[#090909] px-1">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                aria-label="Diminuir quantidade"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/55 transition hover:bg-white/5 hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] disabled:opacity-30"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold text-white tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((current) => current + 1)}
                aria-label="Aumentar quantidade"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/70 transition hover:bg-white/5 hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-auto pt-4" aria-live="polite">
              {hasDiscount && (
                <p className="text-[10px] text-white/40">
                  De {" "}
                  <span className="line-through">
                    {formatPrice(selectedVariant.precoDe)}
                  </span>
                </p>
              )}
              <p className="font-display mt-0.5 whitespace-nowrap text-[24px] font-extrabold leading-none text-[#A9EC17]">
                {formatPrice(selectedVariant.precoPor)}
              </p>
            </div>
          </div>

          <div className="flex flex-col rounded-lg border border-white/[0.08] bg-[#111111] p-4">
            <ShippingCalculator key={selectedVariant.id} variantId={selectedVariant.id} />

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isPending}
              className="font-display mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#A9EC17] px-3 text-[10px] font-extrabold uppercase tracking-[0.2px] text-black transition duration-[250ms] hover:-translate-y-0.5 hover:bg-[#B8FF28] hover:shadow-[0_8px_24px_rgba(169,236,23,0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={2} />
              {isPending
                ? "Adicionando..."
                : feedback.type === "added"
                  ? "Adicionado ao carrinho ✓"
                  : "Comprar na EcomZero"}
            </button>
            <div aria-live="polite">
              {feedback.type === "error" && (
                <p className="mt-2 text-center text-[10px] text-red-400">
                  {feedback.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 rounded-[14px] border border-white/[0.08] bg-[#0F0F0F] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.14)] sm:p-3.5">
        <div>
          <p className="font-display text-[11px] font-bold uppercase leading-4 text-white">
            Ou compre nos marketplaces
          </p>
          <p className="text-[10px] leading-4 text-white/45">
            Você será direcionado para a loja oficial EcomZero
          </p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={handleBuyOnShopee}
            className="group flex min-h-[140px] flex-col items-center rounded-xl border border-white/[0.08] bg-[#111111] p-3 text-center transition duration-[250ms] hover:-translate-y-0.5 hover:border-[#A9EC17]/25 hover:shadow-[0_14px_32px_rgba(0,0,0,0.22)]"
          >
            <span className="flex h-8 items-center gap-1.5 text-lg font-semibold text-[#EE4D2D]">
              <span className="relative inline-flex">
                <ShoppingBag className="h-7 w-7" strokeWidth={1.8} />
                <span className="absolute inset-x-0 top-[9px] text-center text-[10px] font-bold">S</span>
              </span>
              Shopee
            </span>
            <span className="font-display mt-1.5 text-sm font-bold text-white">
              {formatPrice(selectedVariant.precoPor)}
            </span>
            <span className="mt-auto flex h-8 w-full items-center justify-center rounded-md border border-[#EE4D2D] px-2 text-[9px] font-bold uppercase text-[#FF603F] transition group-hover:bg-[#EE4D2D]/10">
              Comprar na Shopee
            </span>
          </button>

          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Integração com o Mercado Livre em breve"
            className="group flex min-h-[140px] flex-col items-center rounded-xl border border-white/[0.08] bg-[#111111] p-3 text-center transition duration-[250ms] disabled:cursor-not-allowed"
          >
            <span className="flex h-8 items-center gap-1.5 text-sm font-bold text-white">
              <span className="inline-flex h-7 w-10 items-center justify-center rounded-[50%] border-2 border-[#2D3277] bg-[#FFE600] text-[#2D3277]">
                <Handshake className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <span className="leading-3.5">mercado<br />livre</span>
            </span>
            <span className="font-display mt-1.5 text-sm font-bold text-white">
              {formatPrice(selectedVariant.precoPor)}
            </span>
            <span className="mt-auto flex h-8 w-full items-center justify-center rounded-md border border-[#FFE600] px-2 text-[9px] font-bold uppercase text-[#FFE600] transition group-hover:bg-[#FFE600]/10">
              Comprar no ML
            </span>
          </button>

          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Integração com o TikTok Shop em breve"
            className="group flex min-h-[140px] flex-col items-center rounded-xl border border-white/[0.08] bg-[#111111] p-3 text-center transition duration-[250ms] disabled:cursor-not-allowed"
          >
            <span className="flex h-8 items-center gap-1.5 text-sm font-bold text-white">
              <Music2 className="h-7 w-7 text-white [filter:drop-shadow(-2px_0_0_#25F4EE)_drop-shadow(2px_0_0_#FE2C55)]" strokeWidth={2.4} />
              TikTok Shop
            </span>
            <span className="font-display mt-1.5 text-sm font-bold text-white">
              {formatPrice(selectedVariant.precoPor)}
            </span>
            <span className="mt-auto flex h-8 w-full items-center justify-center rounded-md border border-[#4DE8E8] px-2 text-[9px] font-bold uppercase text-[#61E9E9] transition group-hover:bg-[#4DE8E8]/10">
              Comprar no TikTok
            </span>
          </button>
        </div>
      </div>

      <p className="sr-only">
        Escolha onde comprar — preço e frete podem variar entre nosso site e os marketplaces.
      </p>
    </div>
  );
}
