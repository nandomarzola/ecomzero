"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import { useCartCount } from "@/components/CartProvider";
import ShippingCalculator from "@/components/ShippingCalculator";
import { addToCartAction } from "@/lib/actions/cartActions";
import type { ProductVariant } from "@/types/product";

type ProductPurchaseProps = {
  variants: ProductVariant[];
  productName: string;
  productImage: string;
};

const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function ProductPurchase({
  variants,
  productName,
  productImage,
}: ProductPurchaseProps) {
  const [selectedId, setSelectedId] = useState(variants[0].id);
  const [quantity, setQuantity] = useState(1);
  const [submittingAction, setSubmittingAction] = useState<"add" | "buy" | null>(null);
  const isPending = submittingAction !== null;
  const { refreshCartCount } = useCartCount();

  const selectedVariant =
    variants.find((variant) => variant.id === selectedId) ?? variants[0];
  const hasDiscount = selectedVariant.precoDe > selectedVariant.precoPor;
  const discountPercentage = hasDiscount
    ? Math.round((1 - selectedVariant.precoPor / selectedVariant.precoDe) * 100)
    : 0;

  const handleSelectVariant = (variantId: string) => {
    setSelectedId(variantId);
    setQuantity(1);
  };

  const addToCart = async (action: "add" | "buy") => {
    if (isPending) return;

    setSubmittingAction(action);
    try {
      const result = await addToCartAction({
        variantId: selectedVariant.id,
        quantidade: quantity,
      });

      if (result.success) {
        refreshCartCount();
        if (action === "buy") {
          window.location.assign("/carrinho");
        } else {
          toast.success("Produto adicionado ao carrinho", {
            description: productName,
            icon: (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={productImage} alt="" className="h-8 w-8 rounded object-cover" />
            ),
          });
        }
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Não foi possível adicionar o produto ao carrinho");
    } finally {
      setSubmittingAction(null);
    }
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
                  className={`font-display min-h-11 rounded-lg border px-3 py-2 text-[10px] font-bold transition duration-[250ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] motion-reduce:transform-none motion-reduce:transition-none ${
                    isSelected
                      ? "border-[var(--brand-color)] bg-[var(--brand-color)] text-black"
                      : "border-white/10 bg-[#0D0D0D] text-white/65 hover:-translate-y-0.5 hover:border-[var(--brand-color)]/35 hover:text-white"
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
        <h2 id="ecomzero-purchase-title" className="sr-only">
          Comprar na EcomZero
        </h2>

        <div className="p-3 sm:p-4">
          <div className="flex items-end justify-between gap-4 rounded-lg border border-white/[0.08] bg-[#111111] p-4">
            <div>
              <p className="text-[11px] font-medium text-white/65">Quantidade</p>
              <div className="mt-2 flex h-10 w-[138px] items-center justify-between rounded-md border border-white/15 bg-[#090909] px-1">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                aria-label="Diminuir quantidade"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/55 transition hover:bg-white/5 hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] disabled:opacity-30"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold text-white tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                disabled={quantity >= 20}
                onClick={() => setQuantity((current) => Math.min(20, current + 1))}
                aria-label="Aumentar quantidade"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/70 transition hover:bg-white/5 hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] disabled:opacity-30"
              >
                <Plus className="h-4 w-4" />
              </button>
              </div>
            </div>

            <div className="text-right" aria-live="polite">
              {hasDiscount && (
                <p className="text-[10px] text-white/40">
                  De {" "}
                  <span className="line-through">
                    {formatPrice(selectedVariant.precoDe)}
                  </span>
                </p>
              )}
              <p className="font-display mt-0.5 whitespace-nowrap text-[24px] font-extrabold leading-none text-[var(--brand-color)]">
                {formatPrice(selectedVariant.precoPor)}
                {hasDiscount && (
                  <span className="ml-2 inline-flex rounded-full bg-[var(--brand-color)]/15 px-2 py-1 align-middle text-[9px] font-bold text-[var(--brand-color)]">
                    {discountPercentage}% OFF
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-white/[0.08] bg-[#111111] p-4">
            <ShippingCalculator variantId={selectedVariant.id} quantity={quantity} />
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/[0.07] px-3 pb-3 sm:px-4 sm:pb-4">
          <button
            type="button"
            onClick={() => addToCart("add")}
            disabled={isPending}
            className="store-primary-action font-display flex min-h-11 w-full items-center justify-center gap-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.2px] transition duration-[250ms] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(169,236,23,0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <ShoppingCart className="h-4 w-4" strokeWidth={2} />
            {submittingAction === "add" && isPending ? "Adicionando..." : "Adicionar ao carrinho"}
          </button>

          <button
            type="button"
            onClick={() => addToCart("buy")}
            disabled={isPending}
            className="font-display flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--brand-color)]/40 bg-transparent px-3 text-[10px] font-extrabold uppercase tracking-[0.2px] text-[var(--brand-color)] transition duration-[250ms] hover:border-[var(--brand-color)] hover:bg-[var(--brand-color)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
          >
            <Zap className="h-4 w-4" strokeWidth={2} />
            {submittingAction === "buy" && isPending ? "Processando..." : "Comprar agora"}
          </button>
        </div>
      </section>
    </div>
  );
}
