import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
};

export default function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</p>
        <Icon className="h-4 w-4 text-white/30" strokeWidth={1.8} />
      </div>
      <p className="font-display mt-3 text-2xl font-bold text-white sm:text-3xl">{value}</p>
    </div>
  );
}
