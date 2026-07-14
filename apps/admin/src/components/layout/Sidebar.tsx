"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

function isActivePath(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function SidebarContent({
  collapsed,
  pathname,
  onNavigate,
}: {
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/[0.08] px-4">
        <span className="font-display text-lg font-extrabold tracking-tight text-white">
          {collapsed ? "EZ" : "ECOMZERO"}
        </span>
      </div>

      {!collapsed && (
        <p className="px-4 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
          Administrativo
        </p>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[#A9EC17]/10 text-[#A9EC17]"
                  : "text-white/60 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop — fixa */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-white/[0.08] bg-[#111111] transition-[width] duration-200 lg:block ${
          collapsed ? "w-[72px]" : "w-[240px]"
        }`}
      >
        <SidebarContent collapsed={collapsed} pathname={pathname} />
      </aside>

      {/* Mobile — drawer sobreposto */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/60"
            onClick={onCloseMobile}
          />
          <aside className="absolute inset-y-0 left-0 w-[260px] border-r border-white/[0.08] bg-[#111111]">
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Fechar menu"
              className="absolute right-3 top-4 z-10 text-white/60 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent collapsed={false} pathname={pathname} onNavigate={onCloseMobile} />
          </aside>
        </div>
      )}
    </>
  );
}
