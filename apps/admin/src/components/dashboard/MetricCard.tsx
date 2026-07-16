import type { LucideIcon } from "lucide-react";

export type MetricCardProps = {
  label: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  active?: boolean;
};

export default function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  active = false,
}: MetricCardProps) {
  return (
    <article
      className={`min-h-[116px] rounded-[9px] border p-[18px] transition ${
        active
          ? "border-[#A9EC17]/80 bg-[radial-gradient(circle_at_82%_20%,rgba(169,236,23,0.1),transparent_48%),#10120D] shadow-[0_0_24px_rgba(169,236,23,0.04)]"
          : "border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Icon
          className={`h-[18px] w-[18px] ${active ? "text-[#A9EC17]" : "text-white/55"}`}
          strokeWidth={1.8}
        />
        <p className={`text-[10px] font-bold uppercase tracking-[0.02em] ${active ? "text-[#A9EC17]" : "text-white/75"}`}>
          {label}
        </p>
      </div>
      <p className="font-display mt-3 text-[27px] font-bold leading-none tracking-[-0.03em] text-white">
        {value}
      </p>
      <p className="mt-2 text-[10px] text-white/50">{subtitle}</p>
    </article>
  );
}
