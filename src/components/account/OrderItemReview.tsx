"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Loader2,
  Pencil,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";

type ReviewStatus = "pending" | "approved" | "rejected";

export type OrderItemReviewData = {
  id: string;
  rating: number;
  comment: string | null;
  photos: string[];
  status: ReviewStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  orderItemId: string;
  productName: string;
  canReview: boolean;
  initialReview: OrderItemReviewData | null;
};

const statusContent: Record<
  ReviewStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  pending: {
    label: "Aguardando aprovação",
    className: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    icon: Loader2,
  },
  approved: {
    label: "Avaliação publicada",
    className: "border-[var(--brand-color)]/20 bg-[var(--brand-color)]/10 text-[#D5FF7B]",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Avaliação removida",
    className: "border-red-400/20 bg-red-400/10 text-red-300",
    icon: XCircle,
  },
};

function Stars({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange?: (rating: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(rating)}
          aria-label={`${rating} estrela${rating > 1 ? "s" : ""}`}
          className="rounded-sm p-0.5 text-amber-300 transition hover:scale-110 disabled:cursor-default"
        >
          <Star
            className="h-5 w-5"
            fill={rating <= value ? "currentColor" : "transparent"}
            strokeWidth={1.8}
          />
        </button>
      ))}
    </div>
  );
}

export default function OrderItemReview({
  orderItemId,
  productName,
  canReview,
  initialReview,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [review, setReview] = useState(initialReview);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(initialReview?.rating ?? 0);
  const [comment, setComment] = useState(initialReview?.comment ?? "");
  const [photos, setPhotos] = useState(initialReview?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!canReview && !review) return null;

  const openEditor = () => {
    setRating(review?.rating ?? 0);
    setComment(review?.comment ?? "");
    setPhotos(review?.photos ?? []);
    setError(null);
    setSuccess(null);
    setEditing(true);
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const available = 3 - photos.length;
    if (files.length > available) {
      setError(`Você pode enviar no máximo 3 fotos. Restam ${available}.`);
      return;
    }

    const selected = Array.from(files);
    const invalid = selected.find(
      (file) =>
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024,
    );
    if (invalid) {
      setError("Cada foto deve ser JPG, PNG ou WebP e ter no máximo 5 MB.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch("/api/account/reviews/upload", {
          method: "POST",
          body: form,
        });
        const body = (await response.json().catch(() => null)) as
          | { url?: string; error?: string }
          | null;
        if (!response.ok || !body?.url) {
          throw new Error(body?.error ?? "Não foi possível enviar a foto.");
        }
        uploaded.push(body.url);
      }
      setPhotos((current) => [...current, ...uploaded]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível enviar a foto.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const submit = async () => {
    if (rating < 1 || rating > 5) {
      setError("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/account/reviews/${orderItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || null, photos }),
      });
      const body = (await response.json().catch(() => null)) as
        | { review?: OrderItemReviewData; error?: string }
        | null;
      if (!response.ok || !body?.review) {
        throw new Error(body?.error ?? "Não foi possível salvar sua avaliação.");
      }
      setReview(body.review);
      setEditing(false);
      setSuccess("Avaliação publicada com sucesso.");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar sua avaliação.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!editing && !review) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--brand-color)]/15 bg-[var(--brand-color)]/[0.04] px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-white">O que achou deste produto?</p>
          <p className="mt-1 text-[10px] text-white/40">Sua avaliação ajuda outros clientes.</p>
        </div>
        <button
          type="button"
          onClick={openEditor}
          className="store-primary-action inline-flex min-h-9 items-center gap-2 px-4 text-[10px] font-extrabold uppercase"
        >
          <Star className="h-3.5 w-3.5" /> Avaliar produto
        </button>
      </div>
    );
  }

  if (!editing && review) {
    const status = statusContent[review.status];
    const StatusIcon = status.icon;
    return (
      <div className="mt-3 rounded-lg border border-white/[0.08] bg-black/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Stars value={review.rating} disabled />
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${status.className}`}>
              <StatusIcon className={`h-3 w-3 ${review.status === "pending" ? "animate-spin" : ""}`} />
              {status.label}
            </span>
          </div>
          {review.status !== "rejected" ? (
            <button type="button" onClick={openEditor} className="inline-flex items-center gap-1.5 text-xs text-white/50 transition hover:text-white">
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
          ) : null}
        </div>
        {review.comment ? <p className="mt-3 text-xs leading-5 text-white/65">{review.comment}</p> : null}
        {review.photos.length > 0 ? (
          <div className="mt-3 flex gap-2">
            {review.photos.map((photo) => (
              <div key={photo} className="relative h-16 w-16 overflow-hidden rounded-md border border-white/10">
                <Image src={photo} alt={`Foto da avaliação de ${productName}`} fill sizes="64px" className="object-cover" />
              </div>
            ))}
          </div>
        ) : null}
        {review.status === "rejected" && review.rejectionReason ? (
          <p className="mt-3 rounded-md border border-red-400/15 bg-red-400/[0.06] px-3 py-2 text-[11px] text-red-300">Removida da loja: {review.rejectionReason}</p>
        ) : null}
        {success ? <p className="mt-3 text-[11px] text-[#D5FF7B]">{success}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-[var(--brand-color)]/20 bg-black/35 p-4">
      <p className="text-xs font-bold text-white">Avaliar {productName}</p>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-white/45">Sua nota *</p>
      <div className="mt-1"><Stars value={rating} onChange={setRating} /></div>

      <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-white/45" htmlFor={`review-comment-${orderItemId}`}>
        Comentário <span className="normal-case text-white/25">(opcional)</span>
      </label>
      <textarea
        id={`review-comment-${orderItemId}`}
        value={comment}
        maxLength={1000}
        rows={4}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Conte como foi sua experiência com o produto"
        className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-[#080808] px-3 py-2.5 text-xs text-white outline-none transition placeholder:text-white/25 focus:border-[var(--brand-color)]/45"
      />
      <p className="mt-1 text-right text-[10px] text-white/30">{comment.length}/1000</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {photos.map((photo) => (
          <div key={photo} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-white/10">
            <Image src={photo} alt="Foto da avaliação" fill sizes="80px" className="object-cover" />
            <button
              type="button"
              onClick={() => setPhotos((current) => current.filter((url) => url !== photo))}
              aria-label="Remover foto"
              className="absolute right-1 top-1 rounded-full bg-black/80 p-1 text-red-300"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {photos.length < 3 ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 text-[10px] text-white/45 transition hover:border-[var(--brand-color)]/40 hover:text-white disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Foto
          </button>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(event) => void uploadFiles(event.target.files)}
        />
      </div>
      <p className="mt-2 text-[10px] text-white/30">Até 3 fotos JPG, PNG ou WebP, com 5 MB cada.</p>
      {review?.status === "approved" ? <p className="mt-3 text-[11px] text-white/35">As alterações serão publicadas assim que você salvar.</p> : null}
      {error ? <p className="mt-3 rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] text-red-300">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving || uploading}
          onClick={() => void submit()}
          className="store-primary-action inline-flex min-h-10 items-center gap-2 px-5 text-[10px] font-extrabold uppercase disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Enviar avaliação
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => setEditing(false)}
          className="min-h-10 rounded-lg border border-white/10 px-4 text-[10px] font-bold uppercase text-white/55 transition hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
