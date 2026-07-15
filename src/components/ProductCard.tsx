"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Heart,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useCartCount } from "@/components/CartProvider";
import { addToCartAction } from "@/lib/actions/cartActions";
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

export default function ProductCard({ product }: ProductCardProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<"idle" | "added">("idle");
  const [pendingAction, setPendingAction] = useState<"buy" | "cart" | null>(null);
  const { refreshCartCount } = useCartCount();
  const router = useRouter();

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

  const handleCartAction = (action: "buy" | "cart") => {
    if (!defaultVariant || isPending) return;

    setPendingAction(action);
    startTransition(async () => {
      const result = await addToCartAction({
        variantId: defaultVariant.id,
        quantidade: 1,
      });

      if (!result.success) {
        toast.error(result.error);
        setPendingAction(null);
        return;
      }

      refreshCartCount();

      if (action === "buy") {
        router.push("/carrinho");
        return;
      }

      setFeedback("added");
      setPendingAction(null);
      toast.success("Produto adicionado ao carrinho");
      window.setTimeout(() => setFeedback("idle"), 1800);
    });
  };

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.13] bg-[linear-gradient(145deg,#111_0%,#080808_100%)] shadow-[0_18px_45px_rgba(0,0,0,0.32)] transition duration-300 motion-reduce:transform-none motion-reduce:transition-none hover:-translate-y-1 hover:border-[#A9EC17]/45 focus-within:border-[#A9EC17]/55">
      <div className="relative aspect-[1.04/1] overflow-hidden bg-[radial-gradient(circle_at_52%_48%,#292929_0%,#171717_48%,#0C0C0C_82%)]">
        <Link
          href={href}
          aria-label={`Ver detalhes de ${product.nome}`}
          className="absolute inset-0 z-[1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] focus-visible:ring-inset"
        >
          <Image
            src={image}
            alt={product.nome}
            fill
            sizes="(max-width: 639px) 86vw, (max-width: 1023px) 46vw, (max-width: 1279px) 30vw, 23vw"
            className="object-contain p-4 transition duration-500 motion-reduce:transition-none group-hover:scale-[1.035] sm:p-5"
          />
        </Link>

        {hasDiscount && (
          <span className="font-display absolute left-4 top-4 z-[2] rounded-lg bg-[#A9EC17] px-3 py-2 text-sm font-black text-black shadow-[0_7px_20px_rgba(169,236,23,0.2)] sm:left-5 sm:top-5 sm:text-base">
            -{discountPercentage}%
          </span>
        )}

        <button
          type="button"
          disabled
          aria-label="Favoritos em breve"
          title="Favoritos em breve"
          className="absolute right-4 top-4 z-[2] inline-flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-full border border-white/25 bg-black/25 text-white/75 backdrop-blur-sm sm:right-5 sm:top-5"
        >
          <Heart className="h-5 w-5" strokeWidth={1.7} />
        </button>
      </div>

      <div className="flex flex-1 flex-col border-t border-white/[0.06] p-4 sm:p-5">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[#A9EC17] sm:text-[11px]">
          {category}
        </p>

        <Link
          href={href}
          className="font-display mt-2 line-clamp-2 min-h-12 text-lg font-extrabold leading-6 text-white outline-none transition hover:text-[#A9EC17] focus-visible:text-[#A9EC17] sm:text-xl sm:leading-7"
        >
          {product.nome}
        </Link>
        <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-white/53 sm:text-sm">
          {product.subtitulo}
        </p>

        {hasRating && (
          <div
            className="mt-3 flex items-center gap-2"
            aria-label={`${rating.toFixed(1)} de 5, com ${product.totalAvaliacoes} avaliações`}
          >
            <div className="flex items-center gap-0.5 text-[#A9EC17]" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${star <= Math.round(rating) ? "fill-current" : ""}`}
                  strokeWidth={1.8}
                />
              ))}
            </div>
            <span className="text-xs text-white/55">
              {rating.toFixed(1)} ({product.totalAvaliacoes})
            </span>
          </div>
        )}

        <div className="mt-auto pt-5">
          {hasPriceVariation && (
            <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/42 sm:text-[10px]">
              A partir de
            </p>
          )}
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <strong className="font-display text-2xl font-black leading-none text-[#A9EC17] sm:text-[28px]">
              {formatPrice(lowestPrice)}
            </strong>
            {hasDiscount && (
              <>
                <span className="text-xs text-white/38 line-through sm:text-sm">
                  {formatPrice(previousPrice)}
                </span>
                <span className="rounded-md bg-[#A9EC17]/15 px-2 py-1 text-[10px] font-extrabold text-[#A9EC17]">
                  {discountPercentage}% OFF
                </span>
              </>
            )}
          </div>

          <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => handleCartAction("buy")}
              disabled={isPending || !defaultVariant}
              className="font-display inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#A9EC17] px-4 text-xs font-black uppercase text-black transition hover:bg-[#BCF53E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            >
              <Zap className="h-5 w-5" strokeWidth={2.2} />
              {pendingAction === "buy" ? "ABRINDO CARRINHO..." : "COMPRAR AGORA"}
            </button>
            <button
              type="button"
              onClick={() => handleCartAction("cart")}
              disabled={isPending || !defaultVariant}
              className="font-display inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#A9EC17]/80 px-4 text-xs font-bold uppercase text-[#A9EC17] transition hover:bg-[#A9EC17]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
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

          <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 border-t border-white/8 pt-4">
            <div className="flex min-w-0 items-start gap-2 pr-2">
              <ShieldCheck className="h-6 w-6 shrink-0 text-[#A9EC17]" strokeWidth={1.7} />
              <div className="min-w-0">
                <p className="text-[9px] font-semibold text-white sm:text-[10px]">Compra segura</p>
                <p className="mt-0.5 hidden text-[8px] leading-3 text-white/45 sm:block">Dados protegidos</p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-2 px-2">
              <Truck className="h-6 w-6 shrink-0 text-[#A9EC17]" strokeWidth={1.7} />
              <div className="min-w-0">
                <p className="text-[9px] font-semibold text-white sm:text-[10px]">Envio rápido</p>
                <p className="mt-0.5 hidden text-[8px] leading-3 text-white/45 sm:block">Para todo o Brasil</p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-2 pl-2">
              <RefreshCw className="h-6 w-6 shrink-0 text-[#A9EC17]" strokeWidth={1.7} />
              <div className="min-w-0">
                <p className="text-[9px] font-semibold text-white sm:text-[10px]">Troca garantida</p>
                <p className="mt-0.5 hidden text-[8px] leading-3 text-white/45 sm:block">Até 7 dias</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
