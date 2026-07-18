"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, PackageOpen, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import type { CartItem } from "@/types/cart";

const formatPrice = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CartDrawerItem({ item }: { item: CartItem }) {
  const { closeCart, removeItem, updateQuantity } = useCart();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  // Confirmação de remoção é MOBILE-ONLY: no desktop o clique remove direto
  // (comportamento atual preservado). Decidido no clique via matchMedia.
  const [confirming, setConfirming] = useState(false);

  const changeQuantity = async (quantidade: number) => {
    setIsPending(true);
    setError("");
    try {
      const result = await updateQuantity(item.id, quantidade);
      if (!result.success) setError(result.error);
    } finally {
      setIsPending(false);
    }
  };

  const remove = async () => {
    setIsPending(true);
    setError("");
    try {
      const result = await removeItem(item.id);
      if (!result.success) setError(result.error);
    } finally {
      setIsPending(false);
    }
  };

  const handleTrashClick = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setConfirming(true);
    } else {
      void remove();
    }
  };

  return (
    <article
      className={`grid grid-cols-[76px_minmax(0,1fr)_32px] gap-3 border-b border-white/[0.09] py-4 transition-opacity max-md:grid-cols-[76px_minmax(0,1fr)_44px] ${isPending ? "pointer-events-none opacity-55" : "opacity-100"}`}
    >
      <Link
        href={`/produto/${item.productSlug}`}
        onClick={closeCart}
        className="relative h-[76px] w-[76px] overflow-hidden rounded-lg border border-white/[0.08] bg-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
        aria-label={`Ver ${item.productName}`}
      >
        {item.productImage ? (
          <Image
            src={item.productImage}
            alt={item.productName}
            fill
            sizes="76px"
            className="object-contain p-1.5"
          />
        ) : (
          <PackageOpen className="absolute inset-0 m-auto h-7 w-7 text-white/25" />
        )}
      </Link>

      <div className="min-w-0">
        <Link
          href={`/produto/${item.productSlug}`}
          onClick={closeCart}
          className="line-clamp-2 text-[12px] font-semibold leading-[1.35] text-white transition hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:text-[var(--brand-color)] max-md:text-sm"
        >
          {item.productName}
        </Link>
        {item.variantLabel ? (
          <p className="mt-1 truncate text-[10px] text-white/45 max-md:text-xs">
            {item.variantLabel}
          </p>
        ) : null}
        <strong className="mt-1.5 block text-[13px] font-bold text-[var(--brand-color)] max-md:text-base">
          {formatPrice(item.precoUnitario)}
        </strong>

        <div className="mt-2.5 inline-flex h-9 items-center rounded-md border border-white/15 bg-black/35 max-md:h-11">
          <button
            type="button"
            onClick={() => void changeQuantity(item.quantidade - 1)}
            disabled={isPending || item.quantidade <= 1}
            className="flex h-9 w-9 items-center justify-center text-white/60 transition hover:bg-white/[0.05] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-color)] disabled:cursor-not-allowed disabled:opacity-25 max-md:h-11 max-md:w-11"
            aria-label={`Diminuir quantidade de ${item.productName}`}
          >
            <Minus className="h-3.5 w-3.5 max-md:h-5 max-md:w-5" />
          </button>
          <span className="w-8 text-center text-xs font-semibold tabular-nums text-white max-md:w-11 max-md:text-base" aria-live="polite">
            {item.quantidade}
          </span>
          <button
            type="button"
            onClick={() => void changeQuantity(item.quantidade + 1)}
            disabled={isPending || item.quantidade >= 20}
            className="flex h-9 w-9 items-center justify-center text-white/60 transition hover:bg-white/[0.05] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-color)] disabled:cursor-not-allowed disabled:opacity-25 max-md:h-11 max-md:w-11"
            aria-label={`Aumentar quantidade de ${item.productName}`}
          >
            <Plus className="h-3.5 w-3.5 max-md:h-5 max-md:w-5" />
          </button>
        </div>
        {item.quantidade >= 20 ? (
          <p className="mt-1.5 text-[9px] text-amber-300 max-md:text-sm">Quantidade máxima atingida.</p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-1.5 text-[9px] leading-4 text-red-400 max-md:text-sm max-md:leading-5">
            {error}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handleTrashClick}
        disabled={isPending}
        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-30 max-md:h-11 max-md:w-11 max-md:self-start"
        aria-label={`Remover ${item.productName} do carrinho`}
        title="Remover produto"
      >
        <Trash2 className="h-4 w-4 max-md:h-5 max-md:w-5" strokeWidth={1.7} />
      </button>

      {confirming ? (
        <div className="col-span-full mt-1 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/[0.06] p-2 max-md:grid max-md:grid-cols-2">
          <span className="min-w-0 flex-1 pl-1 text-sm font-medium text-white/85 max-md:col-span-2 max-md:py-1">
            Remover este item?
          </span>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-11 rounded-md border border-white/20 px-4 text-sm font-semibold text-white/80 transition hover:bg-white/[0.05] max-md:w-full"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void remove()}
            className="min-h-11 rounded-md bg-red-500/90 px-4 text-sm font-bold text-white transition hover:bg-red-500 max-md:w-full"
          >
            Remover
          </button>
        </div>
      ) : null}
    </article>
  );
}
