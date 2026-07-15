"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Truck } from "lucide-react";

type ShippingCalculatorProps = {
  variantId: string;
  quantity: number;
  onCalculatedCep?: (cep: string) => void;
};

type ShippingOption = {
  transportadora: string;
  servico: string;
  preco: number;
  prazoDias: number;
};

const AUTO_RECALC_DEBOUNCE_MS = 450;

const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// A `key` no componente pai (variantId) remonta este componente ao trocar de
// variante, zerando tudo. Mudança de QUANTIDADE não remonta: se o cliente já
// calculou um frete, o resultado é recalculado sozinho (mesmo CEP, nova
// quantidade) com debounce — sem exigir novo clique em "Calcular".
export default function ShippingCalculator({
  variantId,
  quantity,
  onCalculatedCep,
}: ShippingCalculatorProps) {
  const [cep, setCep] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [recalculating, setRecalculating] = useState(false);

  // Último CEP efetivamente calculado — dispara o recálculo automático só
  // depois que o cliente calculou ao menos uma vez.
  const lastCalculatedCep = useRef<string | null>(null);

  const runQuote = useCallback(
    async (targetCep: string, mode: "manual" | "auto") => {
      if (mode === "manual") setStatus("loading");
      else setRecalculating(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId, cep: targetCep, quantidade: quantity }),
        });
        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(data.error ?? "Não foi possível calcular o frete.");
          setStatus("error");
          return;
        }

        lastCalculatedCep.current = targetCep;
        onCalculatedCep?.(targetCep.replace(/\D/g, ""));
        setOptions(data.options);
        setStatus("success");
      } catch {
        setErrorMessage("Não foi possível calcular o frete. Tente novamente.");
        setStatus("error");
      } finally {
        setRecalculating(false);
      }
    },
    [onCalculatedCep, quantity, variantId],
  );

  // runQuote muda quando a quantidade muda → este efeito reroda e agenda o
  // recálculo automático (debounced) usando o último CEP calculado.
  useEffect(() => {
    const target = lastCalculatedCep.current;
    if (!target) return;
    const timer = window.setTimeout(() => {
      void runQuote(target, "auto");
    }, AUTO_RECALC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [runQuote]);

  const handleCalculate = () => {
    void runQuote(cep, "manual");
  };

  return (
    <div>
      <label htmlFor="product-cep" className="text-[11px] font-medium text-white/65">
        Calcular frete e prazo
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="product-cep"
          type="text"
          inputMode="numeric"
          maxLength={9}
          placeholder="Digite seu CEP"
          value={cep}
          onChange={(event) => setCep(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-md border border-white/15 bg-[#090909] px-3 text-[11px] text-white outline-none transition placeholder:text-white/35 focus:border-[#A9EC17] focus:ring-1 focus:ring-[#A9EC17]"
        />
        <button
          type="button"
          onClick={handleCalculate}
          disabled={status === "loading" || recalculating || cep.trim().length === 0}
          className="h-10 shrink-0 rounded-md bg-[#A9EC17] px-4 text-[10px] font-bold text-black transition duration-[250ms] hover:bg-[#B8FF28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
        >
          {status === "loading" ? "Calculando..." : "Calcular"}
        </button>
      </div>

      <div aria-live="polite">
        {status === "error" && (
          <p className="mt-2 text-[10px] text-red-400">{errorMessage}</p>
        )}

        {status === "success" && options.length > 0 && (
          <div className="relative mt-2">
            <ul
              className={`space-y-1.5 transition-opacity ${recalculating ? "opacity-40" : "opacity-100"}`}
            >
              {options.map((option, index) => (
                <li
                  key={`${option.transportadora}-${option.servico}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-white/[0.08] bg-[#090909] px-3 py-2 text-[10px]"
                >
                  <span className="flex items-center gap-1.5 text-white/70">
                    <Truck className="h-3.5 w-3.5 shrink-0 text-[#A9EC17]" strokeWidth={1.8} />
                    {option.transportadora} · {option.servico}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-white/45">{option.prazoDias} dias úteis</span>
                    <span className="font-semibold text-[#A9EC17]">
                      {formatPrice(option.preco)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {recalculating && (
              <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
                <Loader2 className="h-4 w-4 animate-spin text-[#A9EC17]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
