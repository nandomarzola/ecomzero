"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search, User } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";

type HeaderProps = {
  collapsed: boolean;
  onOpenMobileSidebar: () => void;
  onToggleCollapse: () => void;
};

export default function Header({ collapsed, onOpenMobileSidebar, onToggleCollapse }: HeaderProps) {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );
  const title = current?.label ?? "Admin";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/[0.08] bg-[#050505]/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileSidebar}
        aria-label="Abrir menu"
        className="text-white/60 transition hover:text-white lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        className="hidden text-white/60 transition hover:text-white lg:block"
      >
        {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      <h1 className="font-display text-base font-bold text-white">{title}</h1>

      <div className="ml-auto flex items-center gap-2.5 sm:gap-4">
        <label className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="search"
            placeholder="Buscar..."
            className="w-44 rounded-lg border border-white/[0.08] bg-[#111111] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-[#A9EC17]/50 focus:outline-none md:w-56"
          />
        </label>

        <button
          type="button"
          aria-label="Notificações"
          className="text-white/60 transition hover:text-white"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#111111] py-1.5 pl-1.5 pr-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#A9EC17]/15 text-[#A9EC17]">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden text-sm font-medium text-white sm:inline">Nando</span>
        </div>
      </div>
    </header>
  );
}
