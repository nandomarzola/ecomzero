import Image from "next/image";
import { MessageSquareText, Star } from "lucide-react";

type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  photos: string[];
  createdAt: Date;
  user: { name: string | null };
  orderItem: { variant: { label: string } };
};

function publicName(name: string | null) {
  if (!name?.trim()) return "Cliente verificado";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts.at(-1)?.charAt(0).toUpperCase()}.`;
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
  return (
    <section className="mt-12 border-t border-white/[0.08] pt-9 sm:mt-16 sm:pt-11" aria-labelledby="product-reviews-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand-color)]">Compra verificada</p>
          <h2 id="product-reviews-title" className="font-display mt-2 text-2xl font-extrabold text-white">Avaliações de clientes</h2>
        </div>
        {total > 0 && average ? (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0D0D0D] px-4 py-3">
            <span className="font-display text-2xl font-extrabold text-white">{average.toFixed(1).replace(".", ",")}</span>
            <div>
              <div className="flex gap-0.5 text-amber-300">
                {[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-3.5 w-3.5" fill={star <= Math.round(average) ? "currentColor" : "transparent"} />)}
              </div>
              <p className="mt-1 text-[10px] text-white/35">{total} avaliação{total === 1 ? "" : "ões"}</p>
            </div>
          </div>
        ) : null}
      </div>

      {reviews.length === 0 ? (
        <div className="mt-6 flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0B0B0B] text-center">
          <MessageSquareText className="h-8 w-8 text-white/20" />
          <p className="mt-3 text-sm font-semibold text-white/65">Este produto ainda não recebeu avaliações</p>
          <p className="mt-1 text-xs text-white/35">Quem comprar e receber o produto poderá deixar a primeira nota.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-white/[0.09] bg-[#0D0D0D] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{publicName(review.user.name)}</p>
                  <p className="mt-0.5 text-[10px] text-white/35">Compra verificada · {review.orderItem.variant.label}</p>
                </div>
                <time className="text-[10px] text-white/30" dateTime={review.createdAt.toISOString()}>{review.createdAt.toLocaleDateString("pt-BR")}</time>
              </div>
              <div className="mt-3 flex gap-0.5 text-amber-300" aria-label={`${review.rating} de 5 estrelas`}>
                {[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-4 w-4" fill={star <= review.rating ? "currentColor" : "transparent"} />)}
              </div>
              {review.comment ? <p className="mt-3 text-sm leading-6 text-white/60">{review.comment}</p> : null}
              {review.photos.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {review.photos.map((photo) => (
                    <a key={photo} href={photo} target="_blank" rel="noreferrer" className="relative h-24 w-24 overflow-hidden rounded-lg border border-white/10">
                      <Image src={photo} alt="Foto enviada na avaliação" fill sizes="96px" className="object-cover transition hover:scale-105" />
                    </a>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
