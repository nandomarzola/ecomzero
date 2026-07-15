"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, MapPin, UserRound } from "lucide-react";

const items = [
  { label: "Meus pedidos", href: "/conta/pedidos", icon: ClipboardList },
  { label: "Meus dados", href: "/conta/dados", icon: UserRound },
  { label: "Endereços", href: "/conta/enderecos", icon: MapPin },
];

export default function AccountNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Minha conta" className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-2 lg:sticky lg:top-24">
      <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {items.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <li key={href} className="shrink-0 lg:shrink">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-4 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] ${
                  isActive
                    ? "bg-[#A9EC17] text-black"
                    : "text-white/60 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
