import Link from "next/link";
import { Image as ImageIcon, Package, ShoppingBag, Ticket, type LucideIcon } from "lucide-react";

type Action = { href: string; label: string; icon: LucideIcon };

const actions: Action[] = [
  { href: "/produtos/novo", label: "Novo Produto", icon: Package },
  { href: "/banners", label: "Novo Banner", icon: ImageIcon },
  { href: "/cupons", label: "Novo Cupom", icon: Ticket },
  { href: "/pedidos", label: "Ver Pedidos", icon: ShoppingBag },
];

export default function QuickActions() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
      <h2 className="font-display mb-4 text-sm font-bold text-white">Ações rápidas</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex flex-col items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0A0A0A] px-3 py-4 text-center transition hover:border-[#A9EC17]/40 hover:bg-white/[0.03]"
          >
            <Icon className="h-5 w-5 text-[#A9EC17]" strokeWidth={1.8} />
            <span className="text-xs font-medium text-white/80">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
