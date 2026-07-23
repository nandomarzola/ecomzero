"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ExternalLink,
  Loader2,
  MessageSquareText,
  Star,
  X,
} from "lucide-react";
import { moderateReviewAction } from "@/lib/actions/review";
import type {
  ReviewAdminListItem,
  ReviewModerationStatus,
} from "@/lib/services/reviewAdminService";

const tabs: { value: "all" | ReviewModerationStatus; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovadas" },
  { value: "rejected", label: "Removidas" },
];

const statusLabel: Record<ReviewModerationStatus, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Removida",
};

const statusClass: Record<ReviewModerationStatus, string> = {
  pending: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  approved: "border-[#A9EC17]/20 bg-[#A9EC17]/10 text-[#A9EC17]",
  rejected: "border-red-400/20 bg-red-400/10 text-red-300",
};

export default function ReviewModerationList({
  reviews,
}: {
  reviews: ReviewAdminListItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | ReviewModerationStatus>("pending");
  const [rejecting, setRejecting] = useState<ReviewAdminListItem | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const filtered = useMemo(
    () => reviews.filter((review) => tab === "all" || review.status === tab),
    [reviews, tab],
  );

  const moderate = (
    review: ReviewAdminListItem,
    status: "approved" | "rejected",
    rejectionReason: string | null,
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await moderateReviewAction({
        reviewId: review.id,
        status,
        rejectionReason,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRejecting(null);
      setReason("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => {
          const count = reviews.filter(
            (review) => item.value === "all" || review.status === item.value,
          ).length;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${tab === item.value ? "border-[#A9EC17]/35 bg-[#A9EC17]/10 text-[#A9EC17]" : "border-white/10 bg-[#111] text-white/50 hover:text-white"}`}
            >
              {item.label} <span className="ml-1 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {error ? <p className="rounded-lg border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}

      {filtered.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0D0D0D] text-center">
          <MessageSquareText className="h-10 w-10 text-white/20" />
          <h2 className="font-display mt-4 font-bold text-white">Nenhuma avaliação nesta fila</h2>
          <p className="mt-1 text-sm text-white/40">As novas avaliações dos clientes aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <article key={review.id} className="rounded-xl border border-white/[0.09] bg-[#0D0D0D] p-4 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white">
                    <Image src={review.product.image} alt={review.product.name} fill sizes="64px" className="object-contain" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass[review.status]}`}>{statusLabel[review.status]}</span>
                      <span className="text-[10px] text-white/30">{new Date(review.createdAt).toLocaleString("pt-BR")}</span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-white">{review.product.name}</h3>
                    <p className="mt-0.5 text-xs text-white/35">{review.variant}</p>
                  </div>
                </div>

                <div className="min-w-0 flex-[1.25]">
                  <div className="flex gap-0.5 text-amber-300">
                    {[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-4 w-4" fill={star <= review.rating ? "currentColor" : "transparent"} />)}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/65">{review.comment || <span className="italic text-white/30">Cliente enviou apenas a nota.</span>}</p>
                  {review.photos.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.photos.map((photo) => (
                        <a key={photo} href={photo} target="_blank" rel="noreferrer" className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/10">
                          <Image src={photo} alt="Foto enviada pelo cliente" fill sizes="80px" className="object-cover" />
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {review.rejectionReason ? <p className="mt-3 text-xs text-red-300">Motivo: {review.rejectionReason}</p> : null}
                </div>

                <div className="min-w-[220px] text-xs text-white/45">
                  <p className="font-semibold text-white/70">{review.customer.name ?? "Cliente"}</p>
                  <p>{review.customer.email}</p>
                  <Link href={`/pedidos/${review.order.id}`} className="mt-2 inline-flex items-center gap-1 text-[#A9EC17] hover:underline">Pedido #{review.order.id.slice(0, 8)} <ExternalLink className="h-3 w-3" /></Link>
                  {review.status !== "rejected" ? (
                    <div className="mt-4 flex gap-2">
                      {review.status === "pending" ? (
                        <button type="button" disabled={pending} onClick={() => moderate(review, "approved", null)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#A9EC17] px-3 py-2 font-semibold text-black disabled:opacity-50">
                          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Publicar
                        </button>
                      ) : null}
                      <button type="button" disabled={pending} onClick={() => { setRejecting(review); setReason(""); }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/20 px-3 py-2 font-semibold text-red-300 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Remover</button>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {rejecting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#111] p-5 shadow-2xl">
            <h2 className="font-display text-lg font-bold text-white">Remover avaliação</h2>
            <p className="mt-1 text-sm text-white/45">Ela deixará de aparecer na loja e não contará mais na média. Informe o motivo para manter o histórico.</p>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={4} className="mt-4 w-full resize-none rounded-lg border border-white/10 bg-[#080808] p-3 text-sm text-white outline-none focus:border-red-400/40" placeholder="Ex.: conteúdo falso, ofensivo ou com dados pessoais" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRejecting(null)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/55">Voltar</button>
              <button type="button" disabled={pending || !reason.trim()} onClick={() => moderate(rejecting, "rejected", reason.trim())} className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Remover da loja</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
