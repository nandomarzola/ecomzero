import type { LucideIcon } from "lucide-react";

export type TrustBadge = {
  icon: LucideIcon;
  title: string;
  detail: string;
};

type TrustBadgesProps = {
  items: TrustBadge[];
  className?: string;
};

export default function TrustBadges({ items, className = "grid-cols-2 sm:grid-cols-4" }: TrustBadgesProps) {
  return (
    <div
      className={`grid gap-4 rounded-xl border border-white/[0.08] bg-[linear-gradient(90deg,#0D0D0D,#101010_50%,#0D0D0D)] px-4 py-4 sm:gap-5 sm:px-6 ${className}`}
    >
      {items.map(({ icon: Icon, title, detail }) => (
        <div key={title} className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#151515]">
            <Icon className="h-6 w-6 text-[#A9EC17]" strokeWidth={1.6} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-xs font-semibold text-white sm:text-[13px]">
              {title}
            </p>
            <p className="mt-0.5 text-[11px] text-white/50 sm:text-xs">{detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
