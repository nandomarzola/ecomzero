"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, Tag, X } from "lucide-react";
import { useCart } from "@/components/CartProvider";

export default function CartDrawerCoupon() {
  const { cart, applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<
    { type: "success" | "error"; text: string } | undefined
  >();

  const apply = async () => {
    setIsPending(true);
    setMessage(undefined);
    try {
      const result = await applyCoupon(code);
      if (!result.success) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setCode("");
      setMessage({ type: "success", text: "Cupom aplicado com sucesso." });
    } finally {
      setIsPending(false);
    }
  };

  const remove = async () => {
    setIsPending(true);
    setMessage(undefined);
    try {
      const result = await removeCoupon();
      if (!result.success) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: "Cupom removido." });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="border-b border-white/[0.09] py-4" aria-labelledby="drawer-coupon-title">
      <h3 id="drawer-coupon-title" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/65">
        Cupom de desconto
      </h3>

      {cart.coupon ? (
        <div className="mt-2.5 flex min-h-10 items-center gap-2 rounded-md border border-[var(--brand-color)]/30 bg-[var(--brand-color)]/[0.06] px-3">
          <Tag className="h-4 w-4 shrink-0 text-[var(--brand-color)]" />
          <strong className="min-w-0 flex-1 truncate text-xs text-[var(--brand-color)]">
            {cart.coupon.code}
          </strong>
          {cart.coupon.freeShipping ? (
            <span className="text-[9px] text-white/45">Frete grátis</span>
          ) : null}
          <button
            type="button"
            onClick={() => void remove()}
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center text-white/50 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] disabled:opacity-40"
            aria-label="Remover cupom aplicado"
          >
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <form
          className="mt-2.5 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void apply();
          }}
        >
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Digite seu cupom"
            aria-label="Código do cupom"
            autoComplete="off"
            className="h-10 min-w-0 flex-1 rounded-md border border-white/15 bg-[#090909] px-3 text-xs uppercase text-white outline-none transition placeholder:text-white/30 focus:border-[var(--brand-color)]"
          />
          <button
            type="submit"
            disabled={isPending || code.trim().length < 3}
            className="h-10 min-w-[76px] rounded-md border border-white/20 px-3 text-[10px] font-bold uppercase text-white transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : "Aplicar"}
          </button>
        </form>
      )}

      {message ? (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={`mt-2 flex items-center gap-1.5 text-[10px] ${message.type === "error" ? "text-red-400" : "text-[var(--brand-color)]"}`}
        >
          {message.type === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
