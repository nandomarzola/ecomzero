"use client";

import { ArrowLeft, LockKeyhole, LoaderCircle } from "lucide-react";

const formatPrice = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type CartDrawerSummaryProps = {
  subtotal: number;
  discount: number;
  shippingPrice: number | null;
  freeShipping: boolean;
  total: number;
  isPending: boolean;
  isAwaitingPayment: boolean;
  onCheckout: () => void;
  onContinue: () => void;
};

export default function CartDrawerSummary({
  subtotal,
  discount,
  shippingPrice,
  freeShipping,
  total,
  isPending,
  isAwaitingPayment,
  onCheckout,
  onContinue,
}: CartDrawerSummaryProps) {
  return (
    <footer
      className="shrink-0 border-t border-white/[0.1] bg-[#090909]/98 px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_45px_rgba(0,0,0,0.45)] sm:px-5"
      aria-label="Resumo do carrinho"
    >
      <dl className="space-y-1.5 text-[11px] max-md:space-y-2 max-md:text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-white/60">Subtotal</dt>
          <dd className="font-medium text-white">{formatPrice(subtotal)}</dd>
        </div>
        {discount > 0 ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-white/60">Desconto</dt>
            <dd className="font-medium text-[var(--brand-color)]">
              - {formatPrice(discount)}
            </dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <dt className="text-white/60">Frete</dt>
          <dd className={shippingPrice === null ? "text-white/35" : "font-medium text-white"}>
            {shippingPrice === null
              ? "A calcular"
              : freeShipping
                ? "Grátis"
                : formatPrice(shippingPrice)}
          </dd>
        </div>
      </dl>

      <div className="mt-2.5 flex items-end justify-between border-t border-white/[0.09] pt-2.5">
        <span className="text-sm font-bold uppercase text-white">Total</span>
        <strong className="text-[24px] font-extrabold leading-none text-[var(--brand-color)]">
          {formatPrice(total)}
        </strong>
      </div>

      <button
        type="button"
        onClick={onCheckout}
        disabled={isPending}
        className="store-primary-action mt-3 flex min-h-12 w-full items-center justify-center gap-2 px-4 text-xs font-extrabold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60 max-md:min-h-[54px] max-md:text-base"
      >
        {isPending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <LockKeyhole className="h-4 w-4" />
        )}
        {isAwaitingPayment ? "Continuar pagamento" : "Finalizar compra"}
      </button>

      <button
        type="button"
        onClick={onContinue}
        className="mt-2.5 flex min-h-8 w-full items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.06em] text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] max-md:min-h-11 max-md:text-xs"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Continuar comprando
      </button>
    </footer>
  );
}
