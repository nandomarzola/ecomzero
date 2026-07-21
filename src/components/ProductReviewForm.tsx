"use client";

import { CheckCircle2, Loader2, Star } from "lucide-react";
import { useState } from "react";

export default function ProductReviewForm({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (rating < 1 || rating > 5) {
      setError("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          comment: comment.trim() || null,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { review?: { id: string; status: "pending" }; error?: string }
        | null;
      if (!response.ok || !body?.review) {
        throw new Error(body?.error ?? "Não foi possível enviar sua avaliação.");
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível enviar sua avaliação.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[var(--brand-color)]/25 bg-[var(--brand-color)]/[0.06] p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-color)]" />
        <div>
          <p className="font-semibold text-white">Avaliação enviada</p>
          <p className="mt-1 text-sm leading-6 text-white/55">
            Ela será exibida nesta página depois da aprovação da equipe EcomZero.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="mt-8 rounded-2xl border border-[var(--brand-color)]/20 bg-[var(--brand-color)]/[0.035] p-5 sm:p-6"
    >
      <p className="font-display text-lg font-bold text-white">
        Avalie {productName}
      </p>
      <p className="mt-1 text-sm text-white/45">
        Sua avaliação será analisada antes de aparecer na loja.
      </p>

      <fieldset className="mt-5">
        <legend className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">
          Sua nota
        </legend>
        <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Nota da avaliação">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} estrela${value === 1 ? "" : "s"}`}
              onClick={() => setRating(value)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-amber-300 transition hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-color)]"
            >
              <Star
                className="h-7 w-7"
                fill={value <= rating ? "currentColor" : "transparent"}
                strokeWidth={1.8}
              />
            </button>
          ))}
        </div>
      </fieldset>

      <label
        htmlFor={`product-review-comment-${productId}`}
        className="mt-5 block text-xs font-bold uppercase tracking-[0.14em] text-white/55"
      >
        Comentário <span className="normal-case text-white/30">(opcional)</span>
      </label>
      <textarea
        id={`product-review-comment-${productId}`}
        value={comment}
        maxLength={1000}
        rows={4}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Conte como foi sua experiência com este produto"
        className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/25 focus:border-[var(--brand-color)]/50"
      />
      <p className="mt-1 text-right text-xs text-white/30">{comment.length}/1000</p>

      {error ? (
        <p role="alert" className="mt-3 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="store-primary-action font-display mt-4 inline-flex min-h-11 items-center justify-center gap-2 px-6 text-xs font-extrabold uppercase disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
        {saving ? "Enviando..." : "Enviar avaliação"}
      </button>
    </form>
  );
}
