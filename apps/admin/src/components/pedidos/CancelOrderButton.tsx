"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { cancelOrderAction } from "@/lib/actions/order";
import type { OrderCancellationFormInput } from "@/lib/validation/orderCancellation";

const REASONS: Array<{
  value: OrderCancellationFormInput["reason"];
  label: string;
}> = [
  { value: "customer_request", label: "Cliente desistiu" },
  { value: "out_of_stock", label: "Fora de estoque" },
  { value: "suspected_fraud", label: "Fraude suspeita" },
  { value: "other", label: "Outro" },
];

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CancelOrderButton({
  orderId,
  orderStatus,
  total,
  hasMelhorEnvioLabel = false,
  compact = false,
}: {
  orderId: string;
  orderStatus: string;
  total: number;
  hasMelhorEnvioLabel?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<OrderCancellationFormInput["reason"] | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canCancel = ["aguardando_pagamento", "pago"].includes(orderStatus);
  const paid = orderStatus === "pago";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, pending]);

  if (!canCancel) return null;

  const close = () => {
    if (pending) return;
    setOpen(false);
    setError(null);
  };

  const submit = () => {
    if (!reason) {
      setError("Selecione o motivo do cancelamento.");
      return;
    }
    if (reason === "other" && !note.trim()) {
      setError("Descreva o motivo quando selecionar Outro.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await cancelOrderAction(orderId, {
        reason,
        note: note.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex h-8 items-center justify-center rounded-md border border-red-400/20 bg-red-400/[0.04] px-2.5 text-[11px] font-semibold text-red-300 transition hover:border-red-400/40 hover:bg-red-400/[0.08]"
            : "inline-flex h-10 items-center gap-2 rounded-lg border border-red-400/20 bg-red-400/[0.04] px-4 text-sm font-semibold text-red-300 transition hover:border-red-400/40 hover:bg-red-400/[0.08]"
        }
      >
        <Ban className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {compact ? "Cancelar" : "Cancelar pedido"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar confirmação de cancelamento"
            onClick={close}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`cancel-order-title-${orderId}`}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#111111] p-5 shadow-2xl shadow-black/70"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-400/20 bg-red-400/[0.08] text-red-300">
                  <TriangleAlert className="h-5 w-5" />
                </span>
                <div>
                  <h2
                    id={`cancel-order-title-${orderId}`}
                    className="font-display text-lg font-bold text-white"
                  >
                    Cancelar pedido #{orderId.slice(0, 8)}?
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">
                    Esta ação não pode ser desfeita no painel.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                aria-label="Fechar"
                className="rounded-md p-1.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 text-xs leading-relaxed text-amber-100/80">
              {paid ? (
                <>
                  O pagamento de <strong>{money(total)}</strong> será estornado
                  automaticamente no Mercado Pago.
                  {hasMelhorEnvioLabel
                    ? " A etiqueta do Melhor Envio será cancelada antes do estorno."
                    : ""}
                </>
              ) : (
                "O pedido será cancelado sem estorno, pois o pagamento ainda não foi confirmado."
              )}
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-white/70">
                  Motivo do cancelamento <span className="text-red-300">*</span>
                </span>
                <select
                  value={reason}
                  onChange={(event) =>
                    setReason(
                      event.target.value as OrderCancellationFormInput["reason"] | "",
                    )
                  }
                  disabled={pending}
                  className="mt-2 h-11 w-full rounded-lg border border-white/[0.1] bg-[#090909] px-3 text-sm text-white outline-none transition focus:border-[#A9EC17]/50 disabled:opacity-50"
                >
                  <option value="">Selecione um motivo</option>
                  {REASONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-white/70">
                  Observação {reason === "other" ? "*" : "(opcional)"}
                </span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 500))}
                  disabled={pending}
                  rows={3}
                  placeholder="Registre detalhes úteis para o histórico do pedido."
                  className="mt-2 w-full resize-none rounded-lg border border-white/[0.1] bg-[#090909] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#A9EC17]/50 disabled:opacity-50"
                />
                <span className="mt-1 block text-right text-[10px] text-white/30">
                  {note.length}/500
                </span>
              </label>
            </div>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-400/20 bg-red-400/[0.07] px-3 py-2.5 text-xs leading-relaxed text-red-200">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="h-10 rounded-lg border border-white/[0.1] px-4 text-sm font-semibold text-white/65 transition hover:border-white/20 hover:text-white disabled:opacity-40"
              >
                Manter pedido
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || !reason}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                {paid ? "Cancelar e estornar" : "Confirmar cancelamento"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
