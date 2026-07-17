"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Gift, LoaderCircle, Truck } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { isAnnouncementEligibleForUf } from "@/lib/client/announcementRegion";
import { getUserUfSnapshot, subscribeUserCep } from "@/lib/client/cepStorage";
import type { StoreAnnouncementItem, StorePromotionCoupon } from "@/types/storePromotion";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function benefitLabel(coupon: StorePromotionCoupon) {
  if (coupon.type === "frete_gratis") return "frete grátis";
  if (coupon.value === null) return "seu benefício";
  return coupon.type === "percentual" ? `${coupon.value}% de desconto` : `${money(coupon.value)} de desconto`;
}

export default function CartPromotionProgress({ items }: { items: StoreAnnouncementItem[] }) {
  const { cart, applyCoupon, autoApplyFirstPurchaseCoupon } = useCart();
  const storedUf = useSyncExternalStore(subscribeUserCep, getUserUfSnapshot, () => null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [autoRejected, setAutoRejected] = useState(false);
  const automaticAttempts = useRef(new Set<string>());

  const campaigns = useMemo(() => {
    return items.filter((item) =>
      item.coupon &&
      item.coupon.available &&
      isAnnouncementEligibleForUf(item.regioesElegiveis, storedUf),
    );
  }, [items, storedUf]);

  const campaign = campaigns.find((item) => item.coupon?.code === cart.coupon?.code) ?? campaigns[0];
  const coupon = campaign?.coupon;

  const eligibleSubtotal = cart.items.reduce((total, item) => {
    if (!coupon) return total;
    if (coupon.appliesTo === "produto" && item.productId !== coupon.productId) return total;
    if (coupon.appliesTo === "categoria" && (!item.categoryId || !coupon.eligibleCategoryIds.includes(item.categoryId))) return total;
    return total + item.subtotal;
  }, 0);
  const missingEligibleProduct = Boolean(coupon && coupon.appliesTo !== "toda_loja" && eligibleSubtotal <= 0);
  const minimum = coupon?.minimumOrderValue ?? 0;
  const remaining = Math.max(0, minimum - cart.subtotal);
  const progress = minimum > 0 ? Math.min(100, Math.max(4, (cart.subtotal / minimum) * 100)) : 100;
  const isApplied = Boolean(coupon && cart.coupon?.code === coupon.code);
  const hasAnotherCoupon = Boolean(cart.coupon && !isApplied);
  const unlocked = Boolean(coupon && remaining <= 0 && !missingEligibleProduct);

  useEffect(() => {
    if (!coupon?.firstPurchase || !unlocked || isApplied || hasAnotherCoupon || !cart.id) return;
    const attemptKey = `${cart.id}:${coupon.id}:${cart.subtotal}:${eligibleSubtotal}`;
    if (automaticAttempts.current.has(attemptKey)) return;
    automaticAttempts.current.add(attemptKey);
    setIsPending(true);
    setError("");
    setAutoRejected(false);
    void autoApplyFirstPurchaseCoupon(coupon.code)
      .then((result) => {
        if (!result.success) {
          setAutoRejected(true);
          setError(result.error);
        }
      })
      .finally(() => setIsPending(false));
  }, [autoApplyFirstPurchaseCoupon, cart.id, cart.subtotal, coupon, eligibleSubtotal, hasAnotherCoupon, isApplied, unlocked]);

  if (!campaign || !coupon) return null;
  const BenefitIcon = coupon.type === "frete_gratis" ? Truck : Gift;

  const apply = async () => {
    setIsPending(true);
    setError("");
    try {
      const result = await applyCoupon(coupon.code);
      if (!result.success) setError(result.error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="my-3 overflow-hidden rounded-lg border border-[var(--brand-color)]/25 bg-[var(--brand-color)]/[0.055]" aria-label={`Progresso da oferta ${coupon.code}`}>
      <div className="flex items-start gap-3 px-3.5 pb-3 pt-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)]/12 text-[var(--brand-color)]">
          <BenefitIcon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          {isApplied ? (
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[var(--brand-color)]"><CheckCircle2 className="h-4 w-4" /> Benefício aplicado</p>
          ) : autoRejected ? (
            <p className="text-[11px] font-bold uppercase leading-4 text-white">Oferta exclusiva para a primeira compra</p>
          ) : missingEligibleProduct ? (
            <p className="text-[11px] font-bold uppercase leading-4 text-white">Adicione um item de {coupon.scopeLabel} para liberar {benefitLabel(coupon)}</p>
          ) : remaining > 0 ? (
            <p className="text-[11px] font-bold uppercase leading-4 text-white">Faltam <span className="text-[var(--brand-color)]">{money(remaining)}</span> para você conseguir {benefitLabel(coupon)}</p>
          ) : (
            <p className="text-[11px] font-bold uppercase leading-4 text-white">Você liberou <span className="text-[var(--brand-color)]">{benefitLabel(coupon)}</span></p>
          )}
          <p className="mt-1 line-clamp-1 text-[9px] text-white/45">{campaign.texto}</p>
          <p className="mt-2 text-[9px] text-white/40">{coupon.scopeLabel}</p>
        </div>
      </div>

      <div className="h-1.5 bg-black/40" aria-label={`${Math.round(progress)}% da meta atingida`}>
        <div className="h-full bg-[var(--brand-color)] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
      </div>

      {!isApplied && unlocked ? (
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-3.5 py-2.5">
          {coupon.firstPurchase ? (
            <span className="inline-flex items-center gap-2 text-[9px] text-white/45">
              {isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[var(--brand-color)]" /> : null}
              {hasAnotherCoupon ? "Remova o cupom atual para usar esta oferta." : autoRejected ? "Este benefício não está disponível para este cliente." : "Aplicando o benefício automaticamente..."}
            </span>
          ) : (
            <>
              <span className="text-[9px] text-white/45">{hasAnotherCoupon ? "Remova o cupom atual para usar esta oferta." : "A meta foi atingida. Aplique antes de finalizar."}</span>
              <button type="button" onClick={() => void apply()} disabled={isPending || hasAnotherCoupon} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-[var(--brand-color)] px-3 text-[9px] font-bold uppercase text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
                {isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
                Aplicar cupom
              </button>
            </>
          )}
        </div>
      ) : null}
      {error ? <p role="alert" className="border-t border-red-500/20 bg-red-500/[0.08] px-3.5 py-2 text-[9px] text-red-300">{error}</p> : null}
    </section>
  );
}
