"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";

type MenuItem = {
  label: string;
  href: string;
};

type MobileMenuProps = {
  items: MenuItem[];
};

const noopSubscribe = () => () => {};

// Detecta se já passamos da hidratação (portal só pode montar no client) sem
// setState dentro de efeito — useSyncExternalStore é a forma recomendada
// para esse "hasMounted" flag: https://react.dev/reference/react/useSyncExternalStore
function useIsMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export default function MobileMenu({ items }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const mounted = useIsMounted();

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const drawer = open ? (
    <div
      className="fixed inset-0 z-[60] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navegação"
      id="mobile-nav-drawer"
    >
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
          />

          <div className="absolute right-0 top-0 flex h-full w-[82%] max-w-[340px] flex-col border-l border-[#4A0B0B] bg-[#050000] shadow-[-20px_0_50px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-[#3E0808] px-5 py-4">
              <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white/70">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white transition hover:text-[#A9EC17]"
              >
                <X className="h-6 w-6" strokeWidth={1.8} />
              </button>
            </div>

            <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-2 py-4">
              <ul className="flex flex-col">
                {items.map((item, index) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      scroll={!item.href.includes("?")}
                      onClick={() => setOpen(false)}
                      aria-current={index === 0 ? "page" : undefined}
                      className="font-display flex min-h-12 items-center rounded-lg px-4 text-sm font-semibold text-white/90 transition hover:bg-[#170303] hover:text-[#A9EC17]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="border-t border-[#3E0808] px-5 py-4 text-[11px] text-white/45">
              © {new Date().getFullYear()} EcomZero
            </div>
          </div>
        </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-white transition hover:text-[#A9EC17] md:hidden"
      >
        <Menu className="h-6 w-6" strokeWidth={1.8} />
      </button>

      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </>
  );
}
