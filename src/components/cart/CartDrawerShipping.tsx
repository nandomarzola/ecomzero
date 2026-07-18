"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AlertCircle, LoaderCircle, Truck } from "lucide-react";
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
  captureUserCep,
  formatCep,
  getUserCepSnapshot,
  isValidCep,
  sanitizeCep,
  subscribeUserCep,
} from "@/lib/client/cepStorage";

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

const formatPrice = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const maskCep = (value: string) => {
  const digits = sanitizeCep(value).slice(0, 8);
  return digits.length > 5
    ? `${digits.slice(0, 5)}-${digits.slice(5)}`
    : digits;
};

function isShippingOption(value: unknown): value is ShippingOption {
  if (!value || typeof value !== "object") return false;
  const option = value as Record<string, unknown>;
  return (
    typeof option.id === "string" &&
    typeof option.transportadora === "string" &&
    typeof option.servico === "string" &&
    typeof option.preco === "number" &&
    Number.isFinite(option.preco) &&
    typeof option.prazoDias === "number" &&
    Number.isFinite(option.prazoDias)
  );
}

function parseQuoteResponse(value: unknown): QuoteResponse | null {
  if (!value || typeof value !== "object") return null;
  const response = value as Record<string, unknown>;
  if (
    typeof response.quoteId !== "string" ||
    typeof response.expiresAt !== "string" ||
    !Array.isArray(response.options) ||
    !response.options.every(isShippingOption)
  ) {
    return null;
  }
  return {
    quoteId: response.quoteId,
    expiresAt: response.expiresAt,
    options: response.options,
  };
}

function getApiError(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const response = value as Record<string, unknown>;
  if (typeof response.error === "string") return response.error;
  if (Array.isArray(response.issues)) {
    const firstIssue = response.issues[0];
    if (
      firstIssue &&
      typeof firstIssue === "object" &&
      typeof (firstIssue as Record<string, unknown>).message === "string"
    ) {
      return (firstIssue as Record<string, string>).message;
    }
  }
  return null;
}

export default function CartDrawerShipping({
  subtotal,
  active,
}: {
  subtotal: number;
  active: boolean;
}) {
  const storedRaw = useSyncExternalStore(
    subscribeCheckoutShippingSelection,
    getCheckoutShippingSnapshot,
    () => null,
  );
  const storedSelection = useMemo(
    () => parseCheckoutShippingSelection(storedRaw),
    [storedRaw],
  );
  const savedUserCep = useSyncExternalStore(
    subscribeUserCep,
    getUserCepSnapshot,
    () => null,
  );
  const storedSelectionIsValid = Boolean(
    storedSelection &&
      Math.abs(storedSelection.cartSubtotal - subtotal) < 0.005 &&
      !isCheckoutShippingExpired(storedSelection),
  );
  const selection = storedSelectionIsValid ? storedSelection : null;
  const [cepDraft, setCepDraft] = useState<string | null>(null);
  const [quoteState, setQuoteState] = useState<{
    quote: QuoteResponse;
    cep: string;
    subtotal: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const autoQuoteKeyRef = useRef("");
  const calculateRef = useRef<() => void>(() => {});
  const cep =
    cepDraft ??
    (selection?.cep ? formatCep(selection.cep) : savedUserCep ? formatCep(savedUserCep) : "");
  const quote =
    quoteState &&
    quoteState.cep === sanitizeCep(cep) &&
    Math.abs(quoteState.subtotal - subtotal) < 0.005
      ? quoteState.quote
      : null;

  useEffect(() => {
    if (storedSelection && !storedSelectionIsValid) {
      clearCheckoutShippingSelection();
    }
  }, [storedSelection, storedSelectionIsValid]);

  const calculate = async () => {
    if (!isValidCep(cep)) {
      setError("Informe um CEP válido com 8 dígitos.");
      return;
    }

    setIsLoading(true);
    setError("");
    setQuoteState(null);
    clearCheckoutShippingSelection();
    void captureUserCep(cep);

    try {
      const response = await fetch("/api/cart/shipping-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep }),
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(getApiError(data) ?? "Não foi possível calcular o frete.");
        return;
      }

      const parsed = parseQuoteResponse(data);
      if (!parsed) {
        setError("A cotação recebida é inválida. Tente novamente.");
        return;
      }
      setQuoteState({
        quote: parsed,
        cep: sanitizeCep(cep),
        subtotal,
      });
    } catch {
      setError("Serviço de frete indisponível. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    calculateRef.current = () => {
      void calculate();
    };
  });

  useEffect(() => {
    if (!active) {
      autoQuoteKeyRef.current = "";
      return;
    }
    if (selection || quote || isLoading || !isValidCep(cep)) return;

    const quoteKey = `${sanitizeCep(cep)}:${subtotal}`;
    if (autoQuoteKeyRef.current === quoteKey) return;
    autoQuoteKeyRef.current = quoteKey;
    const timer = window.setTimeout(() => calculateRef.current(), 180);
    return () => window.clearTimeout(timer);
  }, [active, cep, isLoading, quote, selection, subtotal]);

  const selectOption = (option: ShippingOption) => {
    if (!quote) return;
    const nextSelection: CheckoutShippingSelection = {
      quoteId: quote.quoteId,
      optionId: option.id,
      cep: sanitizeCep(cep),
      transportadora: option.transportadora,
      servico: option.servico,
      preco: option.preco,
      prazoDias: option.prazoDias,
      expiresAt: quote.expiresAt,
      cartSubtotal: subtotal,
    };
    saveCheckoutShippingSelection(nextSelection);
    setError("");
  };

  return (
    <section className="py-4" aria-labelledby="drawer-shipping-title">
      <h3 id="drawer-shipping-title" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/65 max-md:text-sm">
        Calcule o frete
      </h3>

      <form
        className="mt-2.5 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void calculate();
        }}
      >
        <input
          id="drawer-shipping-cep"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          value={cep}
          maxLength={9}
          onChange={(event) => setCepDraft(maskCep(event.target.value))}
          placeholder="00000-000"
          aria-label="CEP para cálculo do frete"
          className="h-10 min-w-0 flex-1 rounded-md border border-white/15 bg-[#090909] px-3 text-xs text-white outline-none transition placeholder:text-white/30 focus:border-[var(--brand-color)] max-md:h-12 max-md:text-base"
        />
        <button
          type="submit"
          disabled={isLoading || !isValidCep(cep)}
          className="h-10 min-w-[76px] rounded-md border border-white/20 px-3 text-[10px] font-bold uppercase text-white transition hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] disabled:cursor-not-allowed disabled:opacity-40 max-md:h-12 max-md:min-w-[92px] max-md:text-xs"
        >
          {isLoading ? (
            <LoaderCircle className="mx-auto h-4 w-4 animate-spin" />
          ) : selection ? (
            "Alterar"
          ) : (
            "Calcular"
          )}
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-red-400 max-md:text-sm max-md:leading-5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      {selection && !quote ? (
        <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-[var(--brand-color)] bg-[var(--brand-color)]/[0.06] px-3 py-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--brand-color)]" />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-[10px] font-medium text-white max-md:text-sm">
              {selection.transportadora} · {selection.servico}
            </strong>
            <span className="text-[9px] text-white/45 max-md:text-xs">
              Até {selection.prazoDias} dias úteis
            </span>
          </span>
          <strong className="text-[11px] text-[var(--brand-color)] max-md:text-base">
            {formatPrice(selection.preco)}
          </strong>
        </div>
      ) : null}

      {quote ? (
        <fieldset className="mt-3 space-y-2">
          <legend className="sr-only">Escolha uma opção de frete</legend>
          {quote.options.map((option) => {
            const isSelected = selection?.optionId === option.id;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition max-md:gap-3 max-md:py-3.5 ${isSelected ? "border-[var(--brand-color)] bg-[var(--brand-color)]/[0.06]" : "border-white/[0.1] bg-[#0A0A0A] hover:border-white/25"}`}
              >
                <input
                  type="radio"
                  name="drawer-shipping-option"
                  value={option.id}
                  checked={isSelected}
                  onChange={() => selectOption(option)}
                  className="h-3.5 w-3.5 accent-[var(--brand-color)] max-md:h-5 max-md:w-5"
                />
                <Truck className="h-4 w-4 shrink-0 text-[var(--brand-color)] max-md:h-[18px] max-md:w-[18px]" />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[10px] font-medium text-white max-md:text-sm">
                    {option.transportadora} · {option.servico}
                  </strong>
                  <span className="text-[9px] text-white/45 max-md:text-xs">
                    Até {option.prazoDias} dias úteis
                  </span>
                </span>
                <strong className="text-[11px] text-white max-md:text-base">
                  {formatPrice(option.preco)}
                </strong>
              </label>
            );
          })}
        </fieldset>
      ) : null}
    </section>
  );
}
