"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingCart, Zap } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/CartProvider";
import type { Product } from "@/types/product";

// Card da seção "Promoções": igual ao ProductCard padrão (nome, preço, desconto,
// botões "Comprar agora" + "Adicionar ao carrinho") — a ÚNICA diferença é a
// mídia: DUAS imagens quadradas lado a lado (foto principal + 2ª da galeria; se
// só houver uma, repete a principal).
const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PromoProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [feedback, setFeedback] = useState<"idle" | "added">("idle");
  const [pendingAction, setPendingAction] = useState<"buy" | "cart" | null>(null);
  const isPending = pendingAction !== null;

  const href = `/produto/${product.slug}`;
  const orderedVariants = [...product.variantes].sort((a, b) => a.precoPor - b.precoPor);
  const defaultVariant = orderedVariants[0];
  const prices = orderedVariants.map((variant) => variant.precoPor);
  const lowestPrice = defaultVariant?.precoPor ?? 0;
  const previousPrice = defaultVariant?.precoDe ?? 0;
  const hasPriceVariation = new Set(prices).size > 1;
  const hasDiscount = previousPrice > lowestPrice && lowestPrice > 0;
  const discountPercentage = hasDiscount ? Math.round((1 - lowestPrice / previousPrice) * 100) : 0;
  const category = product.categoria.split(" / ").filter(Boolean).at(-1) ?? product.categoria;

  const primaryImage = product.imagem;
  const secondaryImage = product.imagens.find((image) => image !== product.imagem) ?? product.imagem;

  const handleCartAction = async (action: "buy" | "cart") => {
    if (!defaultVariant || isPending) return;
    setPendingAction(action);
    try {
      const result = await addItem(defaultVariant.id, 1, { openDrawer: action === "cart" });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (action === "buy") {
        window.location.assign("/carrinho");
        return;
      }
      setFeedback("added");
      window.setTimeout(() => setFeedback("idle"), 1800);
    } catch {
      toast.error("Não foi possível adicionar o produto ao carrinho");
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <article className="store-product-card group flex h-full min-w-0 flex-col overflow-hidden border border-white/[0.13] bg-[linear-gradient(145deg,#111_0%,#080808_100%)] shadow-[0_18px_45px_rgba(0,0,0,0.32)] transition duration-300 hover:-translate-y-1 hover:border-[var(--brand-color)]/45">
      <div className="relative grid grid-cols-2">
        {hasDiscount && (
          <span className="font-display absolute left-3 top-3 z-[2] rounded-lg bg-[var(--brand-color)] px-2.5 py-1.5 text-xs font-black text-black shadow-[0_7px_20px_rgba(169,236,23,0.2)] sm:text-sm">
            -{discountPercentage}%
          </span>
        )}
        <Link href={href} aria-label={`Ver detalhes de ${product.nome}`} className="contents">
          {[primaryImage, secondaryImage].map((src, index) => (
            <div
              key={index}
              className="relative aspect-square overflow-hidden bg-[radial-gradient(circle_at_52%_48%,#292929_0%,#171717_48%,#0C0C0C_82%)]"
            >
              <Image
                src={src}
                alt={product.nome}
                fill
                sizes="(max-width: 639px) 43vw, (max-width: 1023px) 23vw, 12vw"
                className="object-contain p-3 transition duration-500 group-hover:scale-[1.035]"
              />
            </div>
          ))}
        </Link>
      </div>

      <div className="store-product-card-content flex flex-1 flex-col border-t border-white/[0.06] p-4 sm:p-5">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--brand-color)] sm:text-[11px]">
          {category}
        </p>

        <Link
          href={href}
          className="store-product-card-title font-display mt-2 line-clamp-2 min-h-12 text-lg font-extrabold leading-6 text-white transition hover:text-[var(--brand-color)] sm:text-xl sm:leading-7"
        >
          {product.nome}
        </Link>
        <p className="store-product-card-subtitle mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-white/53 sm:text-sm">
          {product.subtitulo}
        </p>

        <div className="store-product-card-price-area mt-auto pt-5">
          {hasPriceVariation && (
            <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/42 sm:text-[10px]">
              A partir de
            </p>
          )}
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <strong className="font-display text-2xl font-black leading-none text-[var(--brand-color)] sm:text-[28px]">
              {formatPrice(lowestPrice)}
            </strong>
            {hasDiscount && (
              <>
                <span className="text-xs text-white/38 line-through sm:text-sm">{formatPrice(previousPrice)}</span>
                <span className="store-product-card-discount-pill rounded-md bg-[var(--brand-color)]/15 px-2 py-1 text-[10px] font-extrabold text-[var(--brand-color)]">
                  {discountPercentage}% OFF
                </span>
              </>
            )}
          </div>

          <div className="store-product-card-actions mt-5 space-y-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => handleCartAction("buy")}
              disabled={isPending || !defaultVariant}
              className="store-product-card-buy-now store-primary-action font-display inline-flex min-h-12 w-full items-center justify-center gap-2 px-4 text-xs font-black uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              <Zap className="h-5 w-5" strokeWidth={2.2} />
              {pendingAction === "buy" ? "ABRINDO CARRINHO..." : "COMPRAR AGORA"}
            </button>
            <button
              type="button"
              onClick={() => handleCartAction("cart")}
              disabled={isPending || !defaultVariant}
              className="font-display inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[var(--brand-color)]/80 px-4 text-xs font-bold uppercase text-[var(--brand-color)] transition hover:bg-[var(--brand-color)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              {feedback === "added" ? (
                <Check className="h-5 w-5" strokeWidth={2.4} />
              ) : (
                <ShoppingCart className="h-5 w-5" strokeWidth={1.9} />
              )}
              {pendingAction === "cart" ? "ADICIONANDO..." : feedback === "added" ? "ADICIONADO" : "ADICIONAR AO CARRINHO"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
