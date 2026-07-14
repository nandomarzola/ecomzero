"use client";

import { useState } from "react";
import { Truck } from "lucide-react";

type ShippingCalculatorProps = {
  variantId: string;
};

type ShippingOption = {
  transportadora: string;
  servico: string;
  preco: number;
  prazoDias: number;
};

const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Chave prop (variantId) no componente pai reseta esse estado ao trocar de
// variante, em vez de um useEffect ouvindo a mudança.
export default function ShippingCalculator({ variantId }: ShippingCalculatorProps) {
  const [cep, setCep] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCalculate = async () => {
    setStatus("loading");

    try {
      const response = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, cep }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error ?? "Não foi possível calcular o frete.");
        setStatus("error");
        return;
      }

      setOptions(data.options);
      setStatus("success");
    } catch {
      setErrorMessage("Não foi possível calcular o frete. Tente novamente.");
      setStatus("error");
    }
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
          disabled={status === "loading" || cep.trim().length === 0}
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
          <ul className="mt-2 space-y-1.5">
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
        )}
      </div>
    </div>
  );
}
