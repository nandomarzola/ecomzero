import type { LucideIcon } from "lucide-react";

// Card de resumo da tela de Pedidos — ícone circular colorido à esquerda, título,
// valor grande e subtítulo, conforme a referência. Usa os mesmos tokens visuais
// dos cards do dashboard (borda, gradiente, fonte display, glow verde no ativo),
// mas com ícone colorido por tipo, que o MetricCard genérico não faz.

export type SummaryTone = "green" | "amber" | "blue" | "purple";

const ICON_CLASS: Record<SummaryTone, string> = {
  green: "bg-[#A9EC17]/12 text-[#A9EC17]",
  amber: "bg-amber-400/12 text-amber-300",
  blue: "bg-sky-400/12 text-sky-300",
  purple: "bg-violet-400/12 text-violet-300",
};

export default function OrderSummaryCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone,
  active = false,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: SummaryTone;
  active?: boolean;
}) {
  return (
    <article
      className={`flex min-h-[104px] items-center gap-3.5 rounded-[10px] border p-4 transition sm:gap-4 sm:p-5 ${
        active
          ? "border-[#A9EC17]/70 bg-[radial-gradient(circle_at_82%_18%,rgba(169,236,23,0.1),transparent_50%),#10120D] shadow-[0_0_24px_rgba(169,236,23,0.05)]"
          : "border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)]"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${ICON_CLASS[tone]}`}
      >
        <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-white/70">{label}</p>
        <p className="font-display mt-1 text-[26px] font-bold leading-none tracking-[-0.03em] text-white sm:text-[28px]">
          {value}
        </p>
        <p className="mt-1.5 truncate text-[11px] text-white/45">{subtitle}</p>
      </div>
    </article>
  );
}
