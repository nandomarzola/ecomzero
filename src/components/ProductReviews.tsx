"use client";

import Image from "next/image";
import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  ShieldCheck,
  Star,
  Tag,
} from "lucide-react";

type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  photos: string[];
  createdAt: string;
  user: { name: string | null };
  orderItem: { variant: { label: string } };
};

function publicName(name: string | null) {
  if (!name?.trim()) return "Cliente verificado";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts.at(-1)?.charAt(0).toUpperCase()}.`;
}

function initials(name: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "CV";
  return `${parts[0]?.charAt(0) ?? ""}${parts.at(-1)?.charAt(0) ?? ""}`.toUpperCase();
}

function RatingStars({ rating, size = "small" }: { rating: number; size?: "small" | "large" }) {
  return (
    <div className="flex gap-1 text-amber-300" aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={size === "large" ? "h-7 w-7 sm:h-9 sm:w-9" : "h-4 w-4 sm:h-5 sm:w-5"}
          fill={star <= Math.round(rating) ? "currentColor" : "transparent"}
          strokeWidth={1.7}
        />
      ))}
    </div>
  );
}

export default function ProductReviews({
  reviews,
  average,
  total,
}: {
  reviews: PublicReview[];
  average: number | null;
  total: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleReviews = expanded ? reviews : reviews.slice(0, 2);
  const hasMore = reviews.length > 2;

  return (
    <section className="mt-12 border-t border-white/[0.08] pt-9 sm:mt-16 sm:pt-12" aria-labelledby="product-reviews-title">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-color)]">
            <ShieldCheck className="h-4 w-4" /> Compra verificada
          </p>
          <h2 id="product-reviews-title" className="font-display mt-3 text-3xl font-black uppercase leading-none tracking-[-0.04em] text-white sm:text-5xl">
            Avaliações dos clientes
          </h2>
          <p className="mt-3 text-sm text-white/45 sm:text-lg">A opinião de quem já comprou e recebeu o produto.</p>
        </div>

        {total > 0 && average ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 lg:justify-end">
            <RatingStars rating={average} size="large" />
            <span className="font-display text-5xl font-black leading-none tracking-[-0.05em] text-white sm:text-6xl">
              {average.toFixed(1).replace(".", ",")}
            </span>
            <p className="w-full text-left text-xs text-white/45 sm:text-sm lg:text-right">
              <strong className="text-[var(--brand-color)]">{total} avaliação{total === 1 ? "" : "ões"}</strong>
              <span className="mx-2 text-white/20">•</span>
              Baseado em compras verificadas
            </p>
          </div>
        ) : null}
      </div>

      {reviews.length === 0 ? (
        <div className="mt-8 flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0B0B0B] text-center">
          <MessageSquareText className="h-9 w-9 text-white/20" />
          <p className="mt-3 text-sm font-semibold text-white/65">Este produto ainda não recebeu avaliações</p>
          <p className="mt-1 text-xs text-white/35">Quem comprar e receber o produto poderá deixar a primeira nota.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {visibleReviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-white/[0.13] bg-[linear-gradient(145deg,#0E0E0E,#080808)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.25)] sm:p-7">
              <div className="flex flex-col gap-5 border-b border-white/[0.09] pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--brand-color)]/55 bg-[var(--brand-color)]/[0.06] text-lg font-black text-[var(--brand-color)] sm:h-16 sm:w-16 sm:text-xl">
                    {initials(review.user.name)}
                  </span>
                  <div>
                    <p className="font-display text-lg font-bold text-white sm:text-xl">{publicName(review.user.name)}</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand-color)] sm:text-sm">
                      <ShieldCheck className="h-4 w-4" /> Compra verificada
                    </p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="inline-flex items-center gap-2 text-xs text-white/40 sm:text-sm">
                    <CalendarDays className="h-4 w-4" /> Compra realizada em {new Date(review.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                  <div className="mt-3 flex sm:justify-end"><RatingStars rating={review.rating} /></div>
                </div>
              </div>

              <div className="pt-5">
                <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/55 sm:text-sm">
                  <Tag className="h-4 w-4" /> Variante: <strong className="font-medium text-white/80">{review.orderItem.variant.label}</strong>
                </span>
                {review.comment ? <p className="mt-5 max-w-4xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">{review.comment}</p> : null}
                {review.photos.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {review.photos.map((photo) => (
                      <a key={photo} href={photo} target="_blank" rel="noreferrer" className="relative h-28 w-28 overflow-hidden rounded-xl border border-white/15 bg-white/[0.03] sm:h-40 sm:w-40">
                        <Image src={photo} alt="Foto enviada na avaliação" fill sizes="(max-width: 639px) 112px, 160px" className="object-cover transition duration-300 hover:scale-105" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="mt-7 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="font-display inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[var(--brand-color)]/60 px-6 text-xs font-extrabold uppercase text-white transition hover:bg-[var(--brand-color)]/10 hover:text-[var(--brand-color)]"
          >
            <MessageSquareText className="h-5 w-5 text-[var(--brand-color)]" />
            {expanded ? "Mostrar menos" : `Ver mais avaliações (${reviews.length - 2})`}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <p className="mt-3 text-xs text-white/30">Todas as avaliações são de compras reais.</p>
        </div>
      ) : reviews.length > 0 ? (
        <p className="mt-5 text-center text-xs text-white/30">Todas as avaliações são de compras reais.</p>
      ) : null}
    </section>
  );
}
