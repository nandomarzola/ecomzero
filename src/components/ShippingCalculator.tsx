"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Loader2, Truck } from "lucide-react";
import {
  formatCep,
  getUserCepSnapshot,
  isValidCep,
  sanitizeCep,
  subscribeUserCep,
} from "@/lib/client/cepStorage";

type ShippingCalculatorProps = {
  variantId: string;
  quantity: number;
};

type ShippingOption = {
  transportadora: string;
  servico: string;
  preco: number;
  prazoDias: number;
};

const AUTO_CALC_DEBOUNCE_MS = 450;

const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Cotação de frete da página de produto. Com CEP salvo (header/modal), calcula
// SOZINHO ao montar e recalcula ao trocar variante/quantidade — com debounce,
// pra cliques repetidos em +/- virarem uma chamada só. O campo continua
// editável e o botão "Calcular" continua existindo pra simular outro CEP;
// depois do primeiro cálculo, trocas de variante/quantidade recalculam com o
// último CEP usado. Sem CEP salvo e sem cálculo prévio, nada dispara sozinho.
export default function ShippingCalculator({ variantId, quantity }: ShippingCalculatorProps) {
  const savedCep = useSyncExternalStore(subscribeUserCep, getUserCepSnapshot, () => null);
  const [cepDraft, setCepDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [autoLoading, setAutoLoading] = useState(false);

  const cep = cepDraft ?? (savedCep ? formatCep(savedCep) : "");

  // Último CEP efetivamente cotado nesta sessão — habilita recálculo automático
  // pra CEP digitado manualmente depois do primeiro "Calcular".
  const lastCalculatedCep = useRef<string | null>(null);
  // Ref espelho do CEP exibido, pro efeito de auto-cálculo ler o valor atual
  // sem disparar a cada tecla digitada. Atualizada em efeito (não no render —
  // regra react-hooks/refs); declarada ANTES do efeito de auto-cálculo pra
  // rodar primeiro na mesma passada.
  const cepRef = useRef(cep);
  useEffect(() => {
    cepRef.current = cep;
  }, [cep]);

  const runQuote = useCallback(
    async (targetCep: string, mode: "manual" | "auto") => {
      if (mode === "manual") setStatus("loading");
      else setAutoLoading(true);
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

        lastCalculatedCep.current = sanitizeCep(targetCep);
        setOptions(data.options);
        setStatus("success");
      } catch {
        setErrorMessage("Não foi possível calcular o frete. Tente novamente.");
        setStatus("error");
      } finally {
        setAutoLoading(false);
      }
    },
    [variantId, quantity],
  );

  // Auto-cálculo: dispara na montagem (CEP salvo) e quando variante/quantidade/
  // CEP salvo mudam — nunca enquanto o cliente digita no campo. Só roda se há
  // um CEP válido E permissão pra agir sozinho (CEP veio do salvo, ou o
  // cliente já calculou uma vez nesta sessão).
  useEffect(() => {
    const target = cepRef.current;
    const armed = Boolean(savedCep) || lastCalculatedCep.current !== null;
    if (!armed || !isValidCep(target)) return;

    const timer = window.setTimeout(() => {
      void runQuote(target, "auto");
    }, AUTO_CALC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [runQuote, savedCep]);

  const handleCalculate = () => {
    void runQuote(cep, "manual");
  };

  const showInitialAutoSkeleton = autoLoading && status !== "success";

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
          onChange={(event) => setCepDraft(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-md border border-white/15 bg-[#090909] px-3 text-[11px] text-white outline-none transition placeholder:text-white/35 focus:border-[#A9EC17] focus:ring-1 focus:ring-[#A9EC17]"
        />
        <button
          type="button"
          onClick={handleCalculate}
          disabled={status === "loading" || autoLoading || cep.trim().length === 0}
          className="h-10 shrink-0 rounded-md bg-[#A9EC17] px-4 text-[10px] font-bold text-black transition duration-[250ms] hover:bg-[#B8FF28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
        >
          {status === "loading" ? "Calculando..." : "Calcular"}
        </button>
      </div>

      <div aria-live="polite">
        {status === "error" && (
          <p className="mt-2 text-[10px] text-red-400">{errorMessage}</p>
        )}

        {showInitialAutoSkeleton && (
          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-white/45">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#A9EC17]" />
            Calculando frete para o seu CEP...
          </p>
        )}

        {status === "success" && options.length > 0 && (
          <div className="relative mt-2">
            <ul
              className={`space-y-1.5 transition-opacity ${autoLoading ? "opacity-40" : "opacity-100"}`}
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

            {autoLoading && (
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
