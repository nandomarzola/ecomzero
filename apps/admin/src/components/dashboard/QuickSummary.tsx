import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export type QuickSummaryItem = {
  label: string;
  value: string;
  href: string;
  icon: LucideIcon;
};

export default function QuickSummary({ items }: { items: QuickSummaryItem[] }) {
  return (
    <section className="rounded-[9px] border border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)] p-4">
      <h2 className="font-display text-[15px] font-bold text-white">Resumo rápido</h2>
      <div className="mt-3 space-y-1.5">
        {items.map(({ label, value, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="group flex min-h-[54px] items-center gap-3 rounded-md border border-white/[0.07] bg-black/[0.08] p-2.5 transition hover:border-[#A9EC17]/25 hover:bg-[#A9EC17]/[0.025]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#A9EC17]/10 text-[#A9EC17]">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[10px] text-white/65">{label}</span>
              <strong className="mt-0.5 block text-sm text-white">{value}</strong>
            </span>
            <ChevronRight className="h-4 w-4 text-white/45 transition group-hover:translate-x-0.5 group-hover:text-[#A9EC17]" />
          </Link>
        ))}
      </div>
    </section>
  );
}
