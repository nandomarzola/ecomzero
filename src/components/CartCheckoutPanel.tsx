"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Info, LoaderCircle, Tag, Truck, X } from "lucide-react";
import PaymentBadges from "@/components/PaymentBadges";
import { applyCouponAction, removeCouponAction } from "@/lib/actions/cartActions";
import type { AppliedCartCoupon } from "@/types/cart";
import {
  clearCheckoutShippingSelection,
  getCheckoutShippingSnapshot,
  isCheckoutShippingExpired,
  parseCheckoutShippingSelection,
  saveCheckoutShippingSelection,
  subscribeCheckoutShippingSelection,
  type CheckoutShippingSelection,
} from "@/lib/client/checkoutShippingStorage";
import {
  formatCep,
  getUserCepSnapshot,
  isValidCep,
  subscribeUserCep,
} from "@/lib/client/cepStorage";
import { qualifiesForFreeShipping } from "@/lib/shippingPolicy";

type ShippingOption = {
  id: string;
  transportadora: string;
  servico: string;
  preco: number;
  prazoDias: number;
};

type QuoteResponse = {
  quoteId: string;
  expiresAt: string;
  options: ShippingOption[];
};

type CartCheckoutPanelProps = {
  subtotal: number;
  discount: number;
  coupon: AppliedCartCoupon | null;
  productCount: number;
  isLoggedIn: boolean;
};

const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export default function CartCheckoutPanel({
  subtotal,
  discount,
  coupon,
  productCount,
  isLoggedIn,
}: CartCheckoutPanelProps) {
  const router = useRouter();
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponPending, startCoupon] = useTransition();
  const storedRaw = useSyncExternalStore(
    subscribeCheckoutShippingSelection,
    getCheckoutShippingSnapshot,
    () => null,
  );
  const storedSelection = useMemo(
    () => parseCheckoutShippingSelection(storedRaw),
    [storedRaw],
  );
  const [cepDraft, setCepDraft] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [autoLoading, setAutoLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // CEP salvo pelo visitante no header/modal — pré-preenche o campo e, se
  // válido, dispara a cotação SOZINHO (ao abrir o carrinho e quando o
  // conteúdo/peso muda), com prioridade menor que o que o cliente digitou
  // aqui ou a cotação já selecionada.
  const savedUserCep = useSyncExternalStore(subscribeUserCep, getUserCepSnapshot, () => null);

  const storedSelectionIsValid = Boolean(
    storedSelection &&
      Math.abs(storedSelection.cartSubtotal - subtotal) < 0.005,
  );
  const selection = storedSelectionIsValid ? storedSelection : null;
  const cep =
    cepDraft ?? selection?.cep ?? (savedUserCep ? formatCep(savedUserCep) : "");

  useEffect(() => {
    if (storedSelection && !storedSelectionIsValid) {
      clearCheckoutShippingSelection();
    }
  }, [storedSelection, storedSelectionIsValid]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const selectionExpired = selection
    ? isCheckoutShippingExpired(selection, now)
    : false;
  const shippingPrice = selection && !selectionExpired ? selection.preco : 0;
  const freeShipping = qualifiesForFreeShipping(subtotal, coupon?.freeShipping);
  const total = subtotal - discount + (freeShipping ? 0 : shippingPrice);
  const canCheckout = freeShipping || Boolean(selection && !selectionExpired);

  const applyCoupon = () => {
    setCouponError("");
    startCoupon(async () => {
      const result = await applyCouponAction(couponCode);
      if (!result.success) {
        setCouponError(result.error);
        return;
      }
      setCouponCode("");
      router.refresh();
    });
  };

  const removeCoupon = () => {
    setCouponError("");
    startCoupon(async () => {
      await removeCouponAction();
      router.refresh();
    });
  };

  const calculateShipping = async (mode: "manual" | "auto" = "manual") => {
    if (mode === "manual") {
      setStatus("loading");
      setQuote(null);
      clearCheckoutShippingSelection();
    } else {
      // Auto: mantém a lista anterior visível (esmaecida) em vez de limpar.
      setAutoLoading(true);
    }
    setErrorMessage("");

    try {
      const response = await fetch("/api/cart/shipping-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep }),
      });
      const data = await response.json();

      if (!response.ok) {
        const issue = Array.isArray(data.issues) ? data.issues[0]?.message : null;
        setErrorMessage(issue ?? data.error ?? "Não foi possível calcular o frete.");
        setStatus("error");
        return;
      }

      setQuote(data as QuoteResponse);
      setStatus("idle");
    } catch {
      setErrorMessage("Não foi possível calcular o frete. Tente novamente.");
      setStatus("error");
    } finally {
      setAutoLoading(false);
    }
  };

  const hasValidSelection = Boolean(selection && !isCheckoutShippingExpired(selection, now));

  // Auto-cotação: dispara ao abrir o carrinho com CEP preenchido (salvo no
  // header/modal) e re-dispara quando o conteúdo muda (adicionar/remover item,
  // mudar quantidade → subtotal/productCount mudam e invalidam a seleção).
  // Debounce agrupa mudanças em sequência rápida numa chamada só. Nunca roda
  // por cima de uma seleção válida nem enquanto o cliente digita o CEP —
  // digitação manual continua no botão "Calcular".
  const autoQuoteRef = useRef<() => void>(() => {});
  // Sem array de deps de propósito: mantém a closure sempre fresca (padrão
  // "latest ref"); escrever ref dentro de efeito, nunca no render.
  useEffect(() => {
    autoQuoteRef.current = () => {
      if (status === "loading" || autoLoading) return;
      if (!isValidCep(cep)) return;
      void calculateShipping("auto");
    };
  });

  useEffect(() => {
    if (productCount === 0 || freeShipping || hasValidSelection) return;
    const timer = window.setTimeout(() => autoQuoteRef.current(), 600);
    return () => window.clearTimeout(timer);
  }, [freeShipping, productCount, subtotal, savedUserCep, hasValidSelection]);

  const selectShipping = (option: ShippingOption) => {
    if (!quote) return;
    const nextSelection: CheckoutShippingSelection = {
      quoteId: quote.quoteId,
      optionId: option.id,
      cep: onlyDigits(cep),
      transportadora: option.transportadora,
      servico: option.servico,
      preco: option.preco,
      prazoDias: option.prazoDias,
      expiresAt: quote.expiresAt,
      cartSubtotal: subtotal,
    };
    saveCheckoutShippingSelection(nextSelection);
    setErrorMessage("");
    setStatus("idle");
  };

  const goToCheckout = () => {
    if (freeShipping) {
      router.push(isLoggedIn ? "/checkout" : "/checkout/identificacao");
      return;
    }
    if (!canCheckout) {
      setErrorMessage(
        selectionExpired
          ? "Sua cotação expirou. Calcule o frete novamente."
          : quote
            ? "Selecione uma das opções de frete para continuar."
            : "Calcule o frete e selecione uma opção para continuar.",
      );
      setStatus("error");
      document
        .getElementById("shipping-calculator")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        document.getElementById("cart-shipping-cep")?.focus();
      }, 350);
      return;
    }
    router.push(isLoggedIn ? "/checkout" : "/checkout/identificacao");
  };

  return (
    <>
      <aside className="space-y-3 xl:sticky xl:top-24">
        <section
          aria-labelledby="order-summary-title"
          className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5"
        >
          <h2 id="order-summary-title" className="font-display text-lg font-bold text-white">
            Resumo do pedido
          </h2>

          <dl className="mt-5 space-y-3 text-[13px]">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-white/65">
                Subtotal ({productCount} {productCount === 1 ? "item" : "itens"})
              </dt>
              <dd className="font-medium text-white">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="inline-flex items-center gap-1.5 text-white/65">
                Frete
                <Info className="h-3.5 w-3.5" strokeWidth={1.7} />
              </dt>
              <dd className={freeShipping || selection ? "font-medium text-white" : "text-white/40"}>
                {freeShipping
                  ? "Grátis"
                  : selection && !selectionExpired
                  ? formatPrice(selection.preco)
                  : "Calcular"}
              </dd>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-white/65">Desconto{coupon ? ` (${coupon.code})` : ""}</dt>
                <dd className="font-medium text-[#A9EC17]">- {formatPrice(discount)}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4">
            {coupon ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[#A9EC17]/30 bg-[#A9EC17]/[0.06] px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#A9EC17]">
                  <Tag className="h-3.5 w-3.5" /> {coupon.code}
                  {coupon.freeShipping ? <span className="text-[10px] text-white/45">frete grátis</span> : null}
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  disabled={couponPending}
                  className="text-white/45 transition hover:text-white disabled:opacity-50"
                  aria-label="Remover cupom"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  applyCoupon();
                }}
              >
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  placeholder="Cupom de desconto"
                  aria-label="Código do cupom"
                  className="h-10 min-w-0 flex-1 rounded-md border border-white/15 bg-[#090909] px-3 text-xs uppercase text-white outline-none transition placeholder:text-white/32 focus:border-[#A9EC17] max-md:h-12 max-md:text-base"
                />
                <button
                  type="submit"
                  disabled={couponPending || couponCode.trim().length < 3}
                  className="h-10 shrink-0 rounded-md border border-white/15 px-4 text-[11px] font-bold text-white transition hover:border-[#A9EC17]/40 disabled:cursor-not-allowed disabled:opacity-45 max-md:h-12 max-md:text-sm"
                >
                  {couponPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Aplicar"}
                </button>
              </form>
            )}
            {couponError && (
              <p role="alert" className="mt-2 flex gap-1.5 text-[10px] leading-4 text-red-400 max-md:text-sm max-md:leading-5">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {couponError}
              </p>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-white/[0.09] pt-5">
            <span className="font-display text-sm font-bold uppercase text-white">Total</span>
            <strong className="font-display text-[25px] font-extrabold text-[var(--brand-color)]">
              {formatPrice(total)}
            </strong>
          </div>
          <p className="mt-1 min-h-4 text-[10px] text-white/38 max-md:text-xs max-md:leading-5">
            {freeShipping
              ? "A transportadora será definida após a confirmação do pedido."
              : selection && !selectionExpired
              ? `${selection.transportadora} · ${selection.servico}`
              : "Selecione o frete para continuar."}
          </p>

          <button
            type="button"
            onClick={goToCheckout}
            className="store-primary-action font-display mt-5 flex min-h-[54px] w-full items-center justify-center gap-2 px-5 text-xs font-extrabold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white max-md:hidden"
          >
            {canCheckout ? "Finalizar compra" : "Escolher frete para continuar"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>

        {!freeShipping && (
          <section
            id="shipping-calculator"
            aria-labelledby="shipping-calculator-title"
            className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5"
          >
          <h2 id="shipping-calculator-title" className="font-display text-sm font-bold text-white">
            Calcular frete e prazo
          </h2>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void calculateShipping();
            }}
          >
            <input
              id="cart-shipping-cep"
              type="text"
              inputMode="numeric"
              maxLength={9}
              value={cep}
              onChange={(event) => setCepDraft(event.target.value)}
              placeholder="Digite seu CEP"
              aria-label="CEP"
              className="h-11 min-w-0 flex-1 rounded-md border border-white/15 bg-[#090909] px-3 text-xs text-white outline-none transition placeholder:text-white/32 focus:border-[var(--brand-color)] focus:ring-1 focus:ring-[var(--brand-color)] max-md:h-12 max-md:text-base"
            />
            <button
              type="submit"
              disabled={status === "loading" || autoLoading || onlyDigits(cep).length !== 8}
              className="store-primary-action h-11 shrink-0 px-4 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-45 max-md:h-12 max-md:text-sm"
            >
              {status === "loading" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                "Calcular"
              )}
            </button>
          </form>

          {autoLoading && !quote && (
            <p className="mt-3 flex items-center gap-1.5 text-[10px] text-white/45 max-md:text-sm">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[var(--brand-color)]" />
              Calculando frete para o seu CEP...
            </p>
          )}

          {errorMessage && (
            <p role="alert" className="mt-3 flex gap-2 text-[10px] leading-4 text-red-400 max-md:text-sm max-md:leading-5">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {errorMessage}
            </p>
          )}

          {selectionExpired && (
            <p role="alert" className="mt-3 flex gap-2 text-[10px] leading-4 text-amber-300 max-md:text-sm max-md:leading-5">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Sua cotação expirou. Calcule o frete novamente.
            </p>
          )}

          {quote && quote.options.length > 0 && (
            <fieldset
              className={`mt-4 space-y-2 transition-opacity ${autoLoading ? "pointer-events-none opacity-40" : "opacity-100"}`}
            >
              <legend className="mb-2 text-[10px] font-semibold uppercase text-white/50 max-md:text-xs">
                Escolha uma opção
              </legend>
              {quote.options.map((option) => {
                const selected = selection?.optionId === option.id;
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition ${selected ? "border-[var(--brand-color)] bg-[var(--brand-color)]/[0.06]" : "border-white/[0.09] bg-[#090909] hover:border-white/20"}`}
                  >
                    <input
                      type="radio"
                      name="shipping-option"
                      value={option.id}
                      checked={selected}
                      onChange={() => selectShipping(option)}
                      className="h-4 w-4 accent-[var(--brand-color)] max-md:h-5 max-md:w-5"
                    />
                    <Truck className="h-4 w-4 shrink-0 text-[var(--brand-color)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-medium text-white max-md:text-sm">
                        {option.transportadora} · {option.servico}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-white/45 max-md:text-xs">
                        Até {option.prazoDias} dias úteis
                      </span>
                    </span>
                    <strong className="text-xs text-[var(--brand-color)] max-md:text-base">
                      {formatPrice(option.preco)}
                    </strong>
                  </label>
                );
              })}
            </fieldset>
          )}
          </section>
        )}

        <section className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5">
          <PaymentBadges />
        </section>
      </aside>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-white/10 bg-black/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase text-white/45">Total</p>
            <strong className="font-display text-xl font-extrabold text-[var(--brand-color)]">
              {formatPrice(total)}
            </strong>
          </div>
          <button
            type="button"
            onClick={goToCheckout}
            className="store-primary-action font-display min-h-[52px] flex-1 px-4 text-sm font-extrabold uppercase"
          >
            {canCheckout ? "Finalizar compra" : "Escolher frete"}
          </button>
        </div>
      </div>
    </>
  );
}
