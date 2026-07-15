"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, LoaderCircle, Truck } from "lucide-react";
import { saveCheckoutShippingSelection } from "@/lib/client/checkoutShippingStorage";

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

type CheckoutShippingStepProps = {
  subtotal: number;
  initialCep: string;
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const formatCep = (value: string) => {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CheckoutShippingStep({
  subtotal,
  initialCep,
}: CheckoutShippingStepProps) {
  const [cep, setCep] = useState(() => formatCep(initialCep));
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const calculateShipping = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (onlyDigits(cep).length !== 8) {
      setErrorMessage("Informe um CEP válido com 8 dígitos.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setQuote(null);
    try {
      const response = await fetch("/api/cart/shipping-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep }),
      });
      const data = (await response.json().catch(() => null)) as
        | (QuoteResponse & { error?: string })
        | null;
      if (!response.ok || !data) {
        throw new Error(data?.error ?? "Não foi possível calcular o frete.");
      }
      setQuote(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível calcular o frete.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectShipping = (option: ShippingOption) => {
    if (!quote) return;
    saveCheckoutShippingSelection({
      quoteId: quote.quoteId,
      optionId: option.id,
      cep: onlyDigits(cep),
      transportadora: option.transportadora,
      servico: option.servico,
      preco: option.preco,
      prazoDias: option.prazoDias,
      expiresAt: quote.expiresAt,
      cartSubtotal: subtotal,
    });
  };

  return (
    <div className="mx-auto min-h-[65vh] max-w-[720px] px-4 py-10 sm:px-6 sm:py-16">
      <Link
        href="/carrinho"
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#A9EC17] transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao carrinho
      </Link>

      <section className="mt-5 rounded-2xl border border-white/[0.11] bg-[linear-gradient(145deg,#101010,#090909)] p-6 sm:p-9">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#A9EC17]/20 bg-[#A9EC17]/10 text-[#A9EC17]">
          <Truck className="h-5 w-5" />
        </span>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.22em] text-[#A9EC17]">
          Primeira etapa
        </p>
        <h1 className="font-display mt-2 text-[28px] font-extrabold leading-tight text-white sm:text-[36px]">
          Escolha como receber seu pedido
        </h1>
        <p className="mt-2 text-sm leading-6 text-white/50">
          Calcule o frete do carrinho para continuar preenchendo os dados de entrega.
        </p>

        {subtotal <= 0 ? (
          <div className="mt-7 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-200">
            Seu carrinho está vazio. Adicione um produto antes de continuar.
          </div>
        ) : (
          <>
            <form className="mt-7 flex gap-2" onSubmit={calculateShipping}>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={9}
                value={cep}
                onChange={(event) => {
                  setCep(formatCep(event.target.value));
                  setQuote(null);
                  setErrorMessage("");
                }}
                placeholder="Digite seu CEP"
                aria-label="CEP para cálculo do frete"
                className="h-12 min-w-0 flex-1 rounded-md border border-white/[0.14] bg-[#080808] px-4 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-[#A9EC17] focus:ring-1 focus:ring-[#A9EC17]"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="font-display flex h-12 min-w-[118px] items-center justify-center rounded-md bg-[#A9EC17] px-5 text-[11px] font-extrabold uppercase text-black transition hover:bg-[#B8FF28] disabled:cursor-wait disabled:opacity-60"
              >
                {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Calcular"}
              </button>
            </form>

            {errorMessage && (
              <p role="alert" className="mt-3 flex gap-2 text-[11px] leading-5 text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {errorMessage}
              </p>
            )}

            {quote && (
              <fieldset className="mt-6 space-y-2">
                <legend className="mb-3 text-[10px] font-bold uppercase tracking-wider text-white/45">
                  Selecione uma opção para continuar
                </legend>
                {quote.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectShipping(option)}
                    className="flex w-full items-center gap-3 rounded-lg border border-white/[0.1] bg-black/30 p-4 text-left transition hover:border-[#A9EC17] hover:bg-[#A9EC17]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17]"
                  >
                    <Truck className="h-4 w-4 shrink-0 text-[#A9EC17]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-white">
                        {option.transportadora} · {option.servico}
                      </span>
                      <span className="mt-1 block text-[10px] text-white/45">
                        Entrega em até {option.prazoDias} dias úteis
                      </span>
                    </span>
                    <strong className="text-sm text-[#A9EC17]">
                      {formatPrice(option.preco)}
                    </strong>
                  </button>
                ))}
              </fieldset>
            )}
          </>
        )}
      </section>
    </div>
  );
}
