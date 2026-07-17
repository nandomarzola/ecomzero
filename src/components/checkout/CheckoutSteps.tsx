import { Check } from "lucide-react";

// Indicador de etapas do checkout — MOBILE-ONLY (md:hidden). No desktop o fluxo
// já tem hierarquia própria; aqui é para orientar quem usa celular. Puramente
// visual: as rotas (identificacao → pagamento → sucesso) já são separadas.
const STEPS = ["Dados", "Pagamento", "Confirmação"] as const;

export default function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mt-6 mb-5 flex items-center gap-2 md:hidden" aria-label="Etapas do checkout">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                active
                  ? "bg-[var(--brand-color)] text-black"
                  : done
                    ? "bg-[var(--brand-color)]/20 text-[var(--brand-color)]"
                    : "border border-white/20 text-white/40"
              }`}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={2.4} /> : step}
            </span>
            <span
              className={`text-sm font-semibold ${active ? "text-white" : "text-white/45"}`}
            >
              {label}
            </span>
            {step < STEPS.length ? (
              <span className={`ml-auto h-px flex-1 ${done ? "bg-[var(--brand-color)]/40" : "bg-white/12"}`} aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
