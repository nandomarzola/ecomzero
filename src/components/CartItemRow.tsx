"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleCheck, Minus, Plus, Trash2 } from "lucide-react";
import { useCartCount } from "@/components/CartProvider";
import {
  removeCartItemAction,
  updateCartItemAction,
} from "@/lib/actions/cartActions";
import type { CartItem } from "@/types/cart";

const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function CartItemRow({ item }: { item: CartItem }) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { refreshCartCount } = useCartCount();
  const hasDiscount = item.precoDe > item.precoUnitario;
  const discountPercentage = hasDiscount
    ? Math.round(((item.precoDe - item.precoUnitario) / item.precoDe) * 100)
    : 0;

  const handleQuantityChange = (nextQuantity: number) => {
    startTransition(async () => {
      const result = await updateCartItemAction({
        itemId: item.id,
        quantidade: nextQuantity,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setErrorMessage(null);
      refreshCartCount();
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeCartItemAction({ itemId: item.id });

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setErrorMessage(null);
      refreshCartCount();
    });
  };

  return (
    <article
      className={`relative rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-3 transition duration-[250ms] hover:border-white/20 motion-reduce:transition-none max-md:w-full max-md:min-w-0 max-md:overflow-hidden xl:grid xl:grid-cols-[96px_minmax(0,1fr)_116px_116px_112px_40px] xl:items-center xl:gap-4 xl:p-3.5 ${isPending ? "pointer-events-none opacity-50" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-3 pr-10 max-md:pr-12 xl:contents xl:pr-0">
        <Link
          href={`/produto/${item.productSlug}`}
          className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-[#151515] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] sm:h-24 sm:w-24"
        >
          <Image
            src={item.productImage}
            alt={item.productName}
            fill
            sizes="96px"
            className="object-contain"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/produto/${item.productSlug}`}
            title={item.productName}
            className="font-display line-clamp-2 text-[13px] font-bold leading-[1.35] text-white transition hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:text-[var(--brand-color)] sm:text-[15px] max-md:text-sm"
          >
            {item.productName}
          </Link>
          <p className="mt-1 text-[10px] text-white/40 sm:text-[11px] max-md:text-xs">
            Ref: {item.skuInterno ?? item.variantLabel}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-[var(--brand-color)] sm:text-[11px] max-md:text-xs">
            <CircleCheck className="h-3.5 w-3.5" strokeWidth={2} />
            Em estoque
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 border-t border-white/[0.07] pt-3 max-md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] max-md:gap-x-3 xl:contents">
        <div className="min-w-0 max-md:order-1">
          {hasDiscount && (
            <p className="text-[9px] text-white/38 sm:text-[10px]">
              De <span className="line-through">{formatPrice(item.precoDe)}</span>
            </p>
          )}
          <strong className="font-display block whitespace-nowrap text-sm font-extrabold text-[var(--brand-color)] sm:text-base max-md:whitespace-normal max-md:break-words">
            {formatPrice(item.precoUnitario)}
          </strong>
          {discountPercentage > 0 && (
            <span className="mt-1 inline-flex rounded bg-[var(--brand-color)]/[0.08] px-1.5 py-0.5 text-[8px] font-bold text-[var(--brand-color)] sm:text-[9px]">
              Economize {discountPercentage}%
            </span>
          )}
        </div>

        <div className="flex h-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#090909] px-1 max-md:order-3 max-md:col-span-2 max-md:h-12 max-md:w-full">
          <button
            type="button"
            disabled={isPending || item.quantidade <= 1}
            onClick={() => handleQuantityChange(item.quantidade - 1)}
            aria-label="Diminuir quantidade"
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/55 transition hover:bg-white/5 hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] disabled:opacity-30 max-md:h-11 max-md:flex-1"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-7 text-center text-sm font-semibold text-white tabular-nums">
            {item.quantidade}
          </span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleQuantityChange(item.quantidade + 1)}
            aria-label="Aumentar quantidade"
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/65 transition hover:bg-white/5 hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] disabled:opacity-30 max-md:h-11 max-md:flex-1"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="min-w-0 text-right max-md:order-2 max-md:max-w-full max-md:justify-self-end xl:text-left">
          <p className="text-[9px] text-white/42 sm:text-[10px]">Subtotal</p>
          <strong className="font-display block whitespace-nowrap text-sm font-extrabold text-[var(--brand-color)] sm:text-base max-md:whitespace-normal max-md:break-words">
            {formatPrice(item.subtotal)}
          </strong>
        </div>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={handleRemove}
        title="Remover produto"
        aria-label={`Remover ${item.productName} do carrinho`}
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md text-white/42 transition hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-30 max-md:right-2 max-md:top-2 max-md:h-11 max-md:w-11 xl:static xl:h-10 xl:w-10"
      >
        <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </button>

      {errorMessage && (
        <p
          role="alert"
          className="mt-3 text-[10px] text-red-400 max-md:text-sm xl:col-span-full xl:mt-0"
        >
          {errorMessage}
        </p>
      )}
    </article>
  );
}
