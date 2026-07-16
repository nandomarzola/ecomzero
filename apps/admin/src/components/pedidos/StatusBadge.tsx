import type { StatusTone } from "@/lib/orders/status";

// Badge de status reutilizável. Tons alinhados ao padrão do dashboard
// (RecentOrdersTable): verde de marca p/ sucesso, âmbar p/ pendente, vermelho
// p/ cancelado. `info` (azul) fica pronto para estados de envio como "Entregue".
const TONE_CLASS: Record<StatusTone, string> = {
  success: "border-[#A9EC17]/25 bg-[#A9EC17]/10 text-[#A9EC17]",
  warning: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  danger: "border-red-400/25 bg-red-400/10 text-red-300",
  info: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  neutral: "border-white/15 bg-white/[0.06] text-white/60",
};

export default function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${TONE_CLASS[tone]}`}
    >
      {label}
    </span>
  );
}
