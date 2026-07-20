"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Heart,
  ShoppingCart,
  Star,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/CartProvider";
import { useFavorites } from "@/components/FavoritesProvider";
import { trackMetaPixelCommerceEvent } from "@/lib/client/metaPixel";
import type { Product } from "@/types/product";

type ProductCardProps = {
  product: Product;
  layout?: "auto" | "grid";
};

const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const formatCompactCount = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);

export default function ProductCard({ product }: ProductCardProps) {
  const [feedback, setFeedback] = useState<"idle" | "added">("idle");
  const [pendingAction, setPendingAction] = useState<"buy" | "cart" | null>(null);
  const { isAuthenticated: canFavorite, isFavorite, toggle: toggleFavorite } = useFavorites();
  const favorited = isFavorite(product.id);
  const isPending = pendingAction !== null;
  const { addItem } = useCart();

  const href = `/produto/${product.slug}`;
  const orderedVariants = [...product.variantes].sort(
    (first, second) => first.precoPor - second.precoPor,
  );
  const defaultVariant = orderedVariants[0];
  const prices = orderedVariants.map((variant) => variant.precoPor);
  const lowestPrice = defaultVariant?.precoPor ?? 0;
  const previousPrice = defaultVariant?.precoDe ?? 0;
  const hasPriceVariation = new Set(prices).size > 1;
  const hasDiscount = previousPrice > lowestPrice && lowestPrice > 0;
  const discountPercentage = hasDiscount
    ? Math.round((1 - lowestPrice / previousPrice) * 100)
    : 0;
  const rating = product.avaliacaoMedia;
  const hasRating =
    typeof rating === "number" &&
    rating > 0 &&
    product.totalAvaliacoes > 0;
  const category =
    product.categoria.split(" / ").filter(Boolean).at(-1) ?? product.categoria;
  const image =
    product.slug === "sensor-alarme-magnetico-sirene-porta-janela-sem-fio"
      ? "/images/hero-sensor-cutout.png"
      : product.imagem;

  const handleCartAction = async (action: "buy" | "cart") => {
    if (!defaultVariant || isPending) return;

    setPendingAction(action);
    try {
      const result = await addItem(defaultVariant.id, 1, {
        openDrawer: action === "cart",
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      trackMetaPixelCommerceEvent({
        event: "AddToCart",
        items: [{
          variantId: defaultVariant.id,
          quantity: 1,
          unitPrice: defaultVariant.precoPor,
        }],
        value: defaultVariant.precoPor,
        contentName: product.nome,
      });

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
    <article className={`store-product-card group flex h-full min-w-0 flex-col overflow-hidden border border-white/[0.13] bg-[linear-gradient(145deg,#111_0%,#080808_100%)] shadow-[0_18px_45px_rgba(0,0,0,0.32)] transition duration-300 motion-reduce:transform-none motion-reduce:transition-none hover:-translate-y-1 hover:border-[var(--brand-color)]/45 focus-within:border-[var(--brand-color)]/55 ${hasDiscount ? "store-product-card-has-discount" : ""}`}>
      <div className="store-product-card-media relative aspect-[1.04/1] overflow-hidden bg-[radial-gradient(circle_at_52%_48%,#292929_0%,#171717_48%,#0C0C0C_82%)]">
        <Link
          href={href}
          aria-label={`Ver detalhes de ${product.nome}`}
          className="absolute inset-0 z-[1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] focus-visible:ring-inset"
        >
          <Image
            src={image}
            alt={product.nome}
            fill
            sizes="(max-width: 639px) 86vw, (max-width: 1023px) 46vw, (max-width: 1279px) 30vw, 23vw"
            className="store-product-card-image object-contain p-4 transition duration-500 motion-reduce:transition-none group-hover:scale-[1.035] sm:p-5"
          />
        </Link>

        {hasDiscount && (
          <span className="store-product-card-discount-badge font-display absolute left-4 top-4 z-[2] rounded-lg bg-[var(--brand-color)] px-3 py-2 text-sm font-black text-black shadow-[0_7px_20px_rgba(169,236,23,0.2)] sm:left-5 sm:top-5 sm:text-base">
            -{discountPercentage}%
          </span>
        )}

        {canFavorite && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleFavorite(product.id);
            }}
            aria-pressed={favorited}
            aria-label={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            title={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            className={`absolute right-4 top-4 z-[2] inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition sm:right-5 sm:top-5 ${
              favorited
                ? "border-[var(--brand-color)]/70 bg-[var(--brand-color)]/15 text-[var(--brand-color)]"
                : "border-white/25 bg-black/25 text-white/75 hover:border-white/50 hover:text-white"
            }`}
          >
            <Heart className={`h-5 w-5 ${favorited ? "fill-current" : ""}`} strokeWidth={1.7} />
          </button>
        )}
      </div>

      <div className="store-product-card-content flex flex-1 flex-col border-t border-white/[0.06] p-4 sm:p-5">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--brand-color)] sm:text-[11px]">
          {category}
        </p>

        <Link
          href={href}
          className="store-product-card-title font-display mt-2 line-clamp-2 min-h-12 text-lg font-extrabold leading-6 text-white outline-none transition hover:text-[var(--brand-color)] focus-visible:text-[var(--brand-color)] sm:text-xl sm:leading-7"
        >
          {product.nome}
        </Link>
        <p className="store-product-card-subtitle mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-white/53 sm:text-sm">
          {product.subtitulo}
        </p>

        <div
          className="store-product-card-social-proof mt-3 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/52 sm:text-xs"
          aria-label={`${hasRating ? `${rating.toFixed(1)} de 5, ${product.totalAvaliacoes} avaliações` : "Sem avaliações"}, ${product.quantidadeVendida} vendidos`}
        >
          <span className="store-product-card-rating inline-flex items-center gap-1.5">
            <Star
              className={`h-3.5 w-3.5 text-amber-300 ${hasRating ? "fill-current" : ""}`}
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <strong className="font-semibold text-white/75">
              {hasRating ? rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"}
            </strong>
            <span>
              ({formatCompactCount(product.totalAvaliacoes)} {product.totalAvaliacoes === 1 ? "avaliação" : "avaliações"})
            </span>
            <span className="text-white/20" aria-hidden="true">·</span>
          </span>
          <span className="font-medium text-white/58">
            {formatCompactCount(product.quantidadeVendida)} vendido{product.quantidadeVendida === 1 ? "" : "s"}
          </span>
        </div>

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
                <span className="text-xs text-white/38 line-through sm:text-sm">
                  {formatPrice(previousPrice)}
                </span>
                <span className="store-product-card-discount-pill rounded-md bg-[var(--brand-color)]/15 px-2 py-1 text-[10px] font-extrabold text-[var(--brand-color)]">
                  {discountPercentage}% OFF
                </span>
              </>
            )}
          </div>

          <div className="store-product-card-actions mt-5 space-y-2 border-t border-white/10 pt-4 max-md:space-y-3">
            <button
              type="button"
              onClick={() => handleCartAction("buy")}
              disabled={isPending || !defaultVariant}
              className="store-product-card-buy-now store-primary-action font-display inline-flex min-h-12 w-full items-center justify-center gap-2 px-4 text-xs font-black uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50 max-md:min-h-[52px] max-md:text-base sm:text-sm"
            >
              <Zap className="h-5 w-5" strokeWidth={2.2} />
              {pendingAction === "buy" ? "ABRINDO CARRINHO..." : "COMPRAR AGORA"}
            </button>
            <button
              type="button"
              onClick={() => handleCartAction("cart")}
              disabled={isPending || !defaultVariant}
              className="font-display inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[var(--brand-color)]/80 px-4 text-xs font-bold uppercase text-[var(--brand-color)] transition hover:bg-[var(--brand-color)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] disabled:cursor-not-allowed disabled:opacity-50 max-md:min-h-[52px] max-md:text-base sm:text-sm"
            >
              {feedback === "added" ? (
                <Check className="h-5 w-5" strokeWidth={2.4} />
              ) : (
                <ShoppingCart className="h-5 w-5" strokeWidth={1.9} />
              )}
              {pendingAction === "cart"
                ? "ADICIONANDO..."
                : feedback === "added"
                  ? "ADICIONADO"
                  : "ADICIONAR AO CARRINHO"}
            </button>
          </div>

        </div>
      </div>
    </article>
  );
}
