"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/CartProvider";
import type { Product } from "@/types/product";

// Card da seção "Promoções": DUAS imagens quadradas lado a lado (foto principal
// + 2ª foto da galeria do produto; se só houver uma, repete a principal).
// Componente próprio, distinto do ProductCard (imagem única) das outras seções.
const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PromoProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [pending, setPending] = useState(false);

  const href = `/produto/${product.slug}`;
  const orderedVariants = [...product.variantes].sort((a, b) => a.precoPor - b.precoPor);
  const defaultVariant = orderedVariants[0];
  const lowestPrice = defaultVariant?.precoPor ?? 0;
  const previousPrice = defaultVariant?.precoDe ?? 0;
  const hasDiscount = previousPrice > lowestPrice && lowestPrice > 0;
  const discountPercentage = hasDiscount ? Math.round((1 - lowestPrice / previousPrice) * 100) : 0;
  const category = product.categoria.split(" / ").filter(Boolean).at(-1) ?? product.categoria;

  const primaryImage = product.imagem;
  const secondaryImage = product.imagens.find((image) => image !== product.imagem) ?? product.imagem;

  const handleAdd = async () => {
    if (!defaultVariant || pending) return;
    setPending(true);
    try {
      const result = await addItem(defaultVariant.id, 1, { openDrawer: true });
      if (!result.success) toast.error(result.error);
    } catch {
      toast.error("Não foi possível adicionar o produto ao carrinho");
    } finally {
      setPending(false);
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

      <div className="flex flex-1 flex-col border-t border-white/[0.06] p-4 sm:p-5">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--brand-color)] sm:text-[11px]">
          {category}
        </p>
        <Link
          href={href}
          className="font-display mt-2 line-clamp-2 min-h-12 text-lg font-extrabold leading-6 text-white transition hover:text-[var(--brand-color)] sm:text-xl sm:leading-7"
        >
          {product.nome}
        </Link>

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <strong className="font-display text-2xl font-black leading-none text-[var(--brand-color)] sm:text-[28px]">
              {formatPrice(lowestPrice)}
            </strong>
            {hasDiscount && (
              <span className="text-sm text-white/40 line-through">{formatPrice(previousPrice)}</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={pending || !defaultVariant}
            className="store-primary-action font-display mt-4 flex min-h-11 w-full items-center justify-center gap-2 px-4 text-xs font-bold uppercase transition disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            Adicionar
          </button>
        </div>
      </div>
    </article>
  );
}
