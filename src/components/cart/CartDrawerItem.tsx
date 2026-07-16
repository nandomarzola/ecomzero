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

  return (
    <article
      className={`grid grid-cols-[76px_minmax(0,1fr)_32px] gap-3 border-b border-white/[0.09] py-4 transition-opacity ${isPending ? "pointer-events-none opacity-55" : "opacity-100"}`}
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
          className="line-clamp-2 text-[12px] font-semibold leading-[1.35] text-white transition hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:text-[var(--brand-color)]"
        >
          {item.productName}
        </Link>
        {item.variantLabel ? (
          <p className="mt-1 truncate text-[10px] text-white/45">
            {item.variantLabel}
          </p>
        ) : null}
        <strong className="mt-1.5 block text-[13px] font-bold text-[var(--brand-color)]">
          {formatPrice(item.precoUnitario)}
        </strong>

        <div className="mt-2.5 inline-flex h-9 items-center rounded-md border border-white/15 bg-black/35">
          <button
            type="button"
            onClick={() => void changeQuantity(item.quantidade - 1)}
            disabled={isPending || item.quantidade <= 1}
            className="flex h-9 w-9 items-center justify-center text-white/60 transition hover:bg-white/[0.05] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-color)] disabled:cursor-not-allowed disabled:opacity-25"
            aria-label={`Diminuir quantidade de ${item.productName}`}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center text-xs font-semibold tabular-nums text-white" aria-live="polite">
            {item.quantidade}
          </span>
          <button
            type="button"
            onClick={() => void changeQuantity(item.quantidade + 1)}
            disabled={isPending || item.quantidade >= 20}
            className="flex h-9 w-9 items-center justify-center text-white/60 transition hover:bg-white/[0.05] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-color)] disabled:cursor-not-allowed disabled:opacity-25"
            aria-label={`Aumentar quantidade de ${item.productName}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {item.quantidade >= 20 ? (
          <p className="mt-1.5 text-[9px] text-amber-300">Quantidade máxima atingida.</p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-1.5 text-[9px] leading-4 text-red-400">
            {error}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => void remove()}
        disabled={isPending}
        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-30"
        aria-label={`Remover ${item.productName} do carrinho`}
        title="Remover produto"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.7} />
      </button>
    </article>
  );
}
