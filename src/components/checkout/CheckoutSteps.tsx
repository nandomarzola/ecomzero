import { Check } from "lucide-react";

const STEPS = ["Dados", "Pagamento", "Confirmação"] as const;

export default function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="my-6 grid grid-cols-3 md:hidden" aria-label="Etapas do checkout">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="relative flex min-w-0 flex-col items-center gap-2 text-center">
            {step < STEPS.length ? (
              <span
                className={`absolute left-1/2 top-[18px] ml-[18px] h-px w-[calc(100%_-_36px)] ${done ? "bg-[var(--brand-color)]/55" : "bg-white/15"}`}
                aria-hidden="true"
              />
            ) : null}
            <span
              aria-current={active ? "step" : undefined}
              className={`relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
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
              className={`text-sm font-semibold leading-5 ${active ? "text-white" : "text-white/50"}`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
