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
    <section className="rounded-[9px] border border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)] p-4">
      <h2 className="font-display mb-3 text-[15px] font-bold text-white">Ações rápidas</h2>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex min-h-11 items-center justify-center gap-3 rounded-md border border-white/[0.08] bg-black/[0.08] px-3 py-3 text-center transition hover:border-[#A9EC17]/40 hover:bg-[#A9EC17]/[0.035]"
          >
            <Icon className="h-[18px] w-[18px] text-[#A9EC17]" strokeWidth={1.8} />
            <span className="text-[10px] font-medium text-white/85">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
