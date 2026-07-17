"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  ClipboardList,
  Heart,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  UserRound,
  X,
} from "lucide-react";

type MenuItem = {
  label: string;
  href: string;
};

type MobileMenuProps = {
  items: MenuItem[];
};

// Atalhos de conta do cliente logado — espelham o dropdown de conta do header
// desktop (HeaderActions), que no mobile fica oculto. Só existe no drawer mobile.
const accountLinks = [
  { label: "Meus pedidos", href: "/conta/pedidos", icon: ClipboardList },
  { label: "Favoritos", href: "/conta/favoritos", icon: Heart },
  { label: "Endereços", href: "/conta/enderecos", icon: MapPin },
  { label: "Meus dados", href: "/conta/dados", icon: UserRound },
];

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

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

export default function MobileMenu({ items }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const mounted = useIsMounted();
  const { data: session } = useSession();
  const account = session?.user?.email
    ? { name: session.user.name?.trim() || session.user.email, email: session.user.email }
    : null;
  const isAuthenticated = account !== null;

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

  const close = () => setOpen(false);

  const handleSignOut = () => {
    close();
    void signOut({ redirectTo: "/" });
  };

  const drawer = open ? (
    <div
      className="fixed inset-0 z-[60] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menu da conta e navegação"
      id="mobile-nav-drawer"
    >
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={close}
        className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
      />

      <div className="absolute right-0 top-0 flex h-full w-[86%] max-w-[360px] flex-col border-l border-[#4A0B0B] bg-[#050000] shadow-[-20px_0_50px_rgba(0,0,0,0.55)]">
        {/* Cabeçalho: identidade da conta (logado) ou título simples (visitante) */}
        <div className="flex items-center justify-between gap-3 border-b border-[#3E0808] px-5 py-4">
          {isAuthenticated ? (
            <span className="flex min-w-0 items-center gap-3">
              <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--brand-color)] text-xs font-bold text-[var(--brand-color)]">
                {getInitials(account.name)}
              </span>
              <span className="min-w-0">
                <strong className="font-display block truncate text-sm font-semibold text-white">
                  {account.name}
                </strong>
                <span className="block truncate text-[11px] text-white/45">{account.email}</span>
              </span>
            </span>
          ) : (
            <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white/70">
              Menu
            </span>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Fechar menu"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white transition hover:text-[var(--brand-color)]"
          >
            <X className="h-6 w-6" strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          {/* Visitante: CTAs de entrar/cadastrar */}
          {!isAuthenticated && (
            <div className="grid gap-2 px-2 pb-4">
              <Link
                href="/login"
                onClick={close}
                className="store-primary-action font-display flex h-11 w-full items-center justify-center text-[11px] font-bold uppercase transition"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                onClick={close}
                className="font-display flex h-11 w-full items-center justify-center rounded-lg border border-[var(--brand-color)]/55 text-[11px] font-bold uppercase text-[var(--brand-color)] transition hover:bg-[var(--brand-color)]/10"
              >
                Cadastrar
              </Link>
            </div>
          )}

          {/* Conta: atalhos do cliente logado */}
          {isAuthenticated && (
            <nav aria-label="Minha conta" className="mb-3 border-b border-[#3E0808] pb-3">
              <ul className="flex flex-col">
                {accountLinks.map(({ label, href, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={close}
                      className="font-display flex min-h-12 items-center gap-3 rounded-lg px-4 text-sm font-semibold text-white/90 transition hover:bg-[#170303] hover:text-[var(--brand-color)]"
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Navegação da loja */}
          <nav aria-label="Navegação principal">
            <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
              Navegar
            </p>
            <ul className="flex flex-col">
              {items.map((item, index) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    scroll={!item.href.includes("?")}
                    onClick={close}
                    aria-current={index === 0 ? "page" : undefined}
                    className="font-display flex min-h-12 items-center rounded-lg px-4 text-sm font-semibold text-white/90 transition hover:bg-[#170303] hover:text-[var(--brand-color)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Rodapé: sair (logado) ou entrar (visitante) + copyright */}
        <div className="border-t border-[#3E0808] px-2 py-3">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 text-sm font-semibold text-white/80 transition hover:bg-[#170303] hover:text-red-300"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              Sair da conta
            </button>
          ) : (
            <Link
              href="/login"
              onClick={close}
              className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 text-sm font-semibold text-white/80 transition hover:bg-[#170303] hover:text-[var(--brand-color)]"
            >
              <LogIn className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              Entrar na conta
            </Link>
          )}
          <p className="px-4 pt-3 text-[11px] text-white/45">© {new Date().getFullYear()} EcomZero</p>
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
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-white transition hover:text-[var(--brand-color)] md:hidden"
      >
        <Menu className="h-6 w-6" strokeWidth={1.8} />
      </button>

      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </>
  );
}
