"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Gift, Truck } from "lucide-react";
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

function campaignProgress(
  coupon: StorePromotionCoupon,
  cart: ReturnType<typeof useCart>["cart"],
) {
  const eligibleSubtotal = cart.items.reduce((total, item) => {
    if (coupon.appliesTo === "produto" && item.productId !== coupon.productId) return total;
    if (coupon.appliesTo === "categoria" && (!item.categoryId || !coupon.eligibleCategoryIds.includes(item.categoryId))) return total;
    return total + item.subtotal;
  }, 0);
  const missingEligibleProduct = coupon.appliesTo !== "toda_loja" && eligibleSubtotal <= 0;
  const remaining = Math.max(0, (coupon.minimumOrderValue ?? 0) - cart.subtotal);
  return {
    eligibleSubtotal,
    missingEligibleProduct,
    remaining,
    unlocked: remaining <= 0 && !missingEligibleProduct,
  };
}

export default function CartPromotionProgress({ items }: { items: StoreAnnouncementItem[] }) {
  const { cart, autoApplyCampaignCoupon } = useCart();
  const storedUf = useSyncExternalStore(subscribeUserCep, getUserUfSnapshot, () => null);
  const [rejectedCampaignIds, setRejectedCampaignIds] = useState<Set<string>>(() => new Set());
  const automaticAttempts = useRef(new Set<string>());

  const campaigns = useMemo(() => {
    return items.filter((item) =>
      item.coupon &&
      item.coupon.available &&
      !rejectedCampaignIds.has(item.coupon.id) &&
      isAnnouncementEligibleForUf(item.regioesElegiveis, storedUf),
    );
  }, [items, rejectedCampaignIds, storedUf]);

  const campaign = campaigns.find((item) => item.coupon?.code === cart.coupon?.code) ??
    campaigns.find((item) => item.coupon && campaignProgress(item.coupon, cart).unlocked) ??
    [...campaigns].sort((first, second) => {
      if (!first.coupon) return 1;
      if (!second.coupon) return -1;
      const firstProgress = campaignProgress(first.coupon, cart);
      const secondProgress = campaignProgress(second.coupon, cart);
      if (firstProgress.missingEligibleProduct !== secondProgress.missingEligibleProduct) {
        return firstProgress.missingEligibleProduct ? 1 : -1;
      }
      return firstProgress.remaining - secondProgress.remaining;
    })[0];
  const coupon = campaign?.coupon;

  const selectedProgress = coupon ? campaignProgress(coupon, cart) : null;
  const eligibleSubtotal = selectedProgress?.eligibleSubtotal ?? 0;
  const missingEligibleProduct = selectedProgress?.missingEligibleProduct ?? false;
  const minimum = coupon?.minimumOrderValue ?? 0;
  const remaining = selectedProgress?.remaining ?? 0;
  const progress = minimum > 0 ? Math.min(100, Math.max(4, (cart.subtotal / minimum) * 100)) : 100;
  const isApplied = Boolean(coupon && cart.coupon?.code === coupon.code);
  const hasAnotherCoupon = Boolean(cart.coupon && !isApplied);
  const unlocked = selectedProgress?.unlocked ?? false;

  useEffect(() => {
    if (!coupon || !unlocked || isApplied || hasAnotherCoupon || !cart.id) return;
    const attemptKey = `${cart.id}:${coupon.id}:${cart.subtotal}:${eligibleSubtotal}`;
    if (automaticAttempts.current.has(attemptKey)) return;
    automaticAttempts.current.add(attemptKey);
    void autoApplyCampaignCoupon(coupon.code)
      .then((result) => {
        if (!result.success || result.cart.coupon?.code !== coupon.code) {
          setRejectedCampaignIds((current) => {
            const next = new Set(current);
            next.add(coupon.id);
            return next;
          });
        }
      });
  }, [autoApplyCampaignCoupon, cart.id, cart.subtotal, coupon, eligibleSubtotal, hasAnotherCoupon, isApplied, unlocked]);

  if (!campaign || !coupon) return null;
  if (unlocked && !isApplied && !hasAnotherCoupon) return null;
  const BenefitIcon = coupon.type === "frete_gratis" ? Truck : Gift;

  return (
    <section className="my-3 overflow-hidden rounded-lg border border-[var(--brand-color)]/25 bg-[var(--brand-color)]/[0.055]" aria-label={`Progresso da oferta ${coupon.code}`}>
      <div className="flex items-start gap-3 px-3.5 pb-3 pt-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)]/12 text-[var(--brand-color)]">
          <BenefitIcon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          {isApplied ? (
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[var(--brand-color)]"><CheckCircle2 className="h-4 w-4" /> Benefício aplicado</p>
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

      {!isApplied && unlocked && hasAnotherCoupon ? (
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-3.5 py-2.5">
          <span className="inline-flex items-center gap-2 text-[9px] text-white/45">
            Remova o cupom atual para usar esta oferta.
          </span>
        </div>
      ) : null}
    </section>
  );
}
