"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
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
  const { refreshCartCount } = useCartCount();

  const href = `/produto/${product.slug}`;
  const defaultVariant = product.variantes[0];
  const prices = product.variantes.map((variant) => variant.precoPor);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const hasPriceVariation = new Set(prices).size > 1;
  const image =
    product.slug === "sensor-alarme-magnetico-sirene-porta-janela-sem-fio"
      ? "/images/hero-sensor-cutout.png"
      : product.imagem;

  const handleQuickAdd = () => {
    if (!defaultVariant) return;

    startTransition(async () => {
      const result = await addToCartAction({
        variantId: defaultVariant.id,
        quantidade: 1,
      });

      if (result.success) {
        refreshCartCount();
        setFeedback("added");
        window.setTimeout(() => setFeedback("idle"), 1800);
      }
    });
  };

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[10px] border border-white/[0.08] bg-[#0D0D0D] transition duration-300 motion-reduce:transform-none motion-reduce:transition-none hover:-translate-y-[3px] hover:border-[#A9EC17]/45 focus-within:border-[#A9EC17]/55">
      <Link
        href={href}
        className="relative block aspect-[1.08/1] overflow-hidden bg-[radial-gradient(circle_at_50%_55%,#222_0%,#151515_48%,#0D0D0D_78%)] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] focus-visible:ring-inset sm:p-5"
      >
        <Image
          src={image}
          alt={product.nome}
          fill
          sizes="(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 19vw"
          className="object-contain p-3 transition duration-300 motion-reduce:transition-none group-hover:scale-[1.03] sm:p-4"
        />
      </Link>

      <div className="flex flex-1 flex-col border-t border-white/[0.06] p-3 sm:p-4">
        <Link
          href={href}
          className="font-display line-clamp-2 min-h-10 text-[12px] font-semibold leading-5 text-white outline-none transition hover:text-[#A9EC17] focus-visible:text-[#A9EC17] sm:text-sm"
        >
          {product.nome}
        </Link>
        <p className="mt-1 line-clamp-2 min-h-8 text-[10px] leading-4 text-white/52 sm:text-[11px]">
          {product.subtitulo}
        </p>

        <div className="mt-auto pt-3">
          {hasPriceVariation && (
            <p className="text-[9px] font-medium uppercase tracking-wide text-white/45 sm:text-[10px]">
              A partir de
            </p>
          )}
          <strong className="font-display block text-base font-extrabold text-[#A9EC17] sm:text-lg">
            {formatPrice(lowestPrice)}
          </strong>

          <div className="mt-3 grid grid-cols-[1fr_38px] gap-2">
            <Link
              href={href}
              aria-label={`Ver produto ${product.nome}`}
              className="font-display inline-flex min-h-[38px] items-center justify-center rounded-md border border-white/20 px-2 text-center text-[9px] font-bold text-white transition hover:border-[#A9EC17] hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] sm:text-[10px]"
            >
              VER PRODUTO
            </Link>
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={isPending || !defaultVariant}
              aria-label={`Adicionar ${product.nome} ao carrinho`}
              className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-md border border-white/20 text-white transition hover:border-[#A9EC17] hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {feedback === "added" ? (
                <Check className="h-4 w-4 text-[#A9EC17]" strokeWidth={2.5} />
              ) : (
                <ShoppingCart className="h-4 w-4" strokeWidth={1.8} />
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
