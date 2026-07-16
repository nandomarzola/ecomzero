"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Heart,
  LogIn,
  LogOut,
  MapPin,
  ShoppingCart,
  Tag,
  UserRound,
} from "lucide-react";
import CartBadgeCount from "@/components/CartBadgeCount";
import HeaderCepButton from "@/components/HeaderCepButton";

type HeaderAccount = {
  name: string;
  email: string;
};

type HeaderActionsProps = {
  compact?: boolean;
  account?: HeaderAccount | null;
};

const accountItems = [
  { label: "Meus pedidos", icon: ClipboardList, href: "/conta/pedidos", comingSoon: false },
  { label: "Meus dados", icon: UserRound, href: "/conta/dados", comingSoon: false },
  { label: "Endereços", icon: MapPin, href: "/conta/enderecos", comingSoon: false },
  { label: "Formas de pagamento", icon: CreditCard, href: null, comingSoon: true },
  { label: "Favoritos", icon: Heart, href: null, comingSoon: true },
  { label: "Cupons e benefícios", icon: Tag, href: null, comingSoon: true },
  { label: "Notificações", icon: Bell, href: null, comingSoon: true },
];

const guestItems = accountItems.slice(0, 5).filter(
  (item) => item.label !== "Formas de pagamento",
);

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

export default function HeaderActions({
  compact = false,
  account = null,
}: HeaderActionsProps) {
  const { data: session } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const sessionAccount = session?.user?.email
    ? {
        name: session.user.name?.trim() || session.user.email,
        email: session.user.email,
      }
    : null;
  const activeAccount = account ?? sessionAccount;
  const isAuthenticated = activeAccount !== null;
  const accountMenuRef = useRef<HTMLDetailsElement>(null);

  const closeAccountMenu = () => {
    if (accountMenuRef.current) {
      accountMenuRef.current.open = false;
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    closeAccountMenu();

    try {
      await signOut({ redirectTo: "/" });
    } finally {
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const menu = accountMenuRef.current;

      if (
        menu?.open &&
        event.target instanceof Node &&
        !menu.contains(event.target)
      ) {
        menu.open = false;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const menu = accountMenuRef.current;

      if (event.key !== "Escape" || !menu?.open) {
        return;
      }

      menu.open = false;
      const summary = menu.querySelector("summary");

      if (summary instanceof HTMLElement) {
        summary.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className={`header-actions flex shrink-0 items-center ${compact ? "ml-0 gap-0" : "ml-auto gap-4 lg:gap-6"}`}>
      <HeaderCepButton className={compact ? "hidden" : "hidden xl:block"} />

      <details
        ref={accountMenuRef}
        className={`group/account relative ${compact ? "hidden" : "hidden lg:block"}`}
      >
        <summary className="header-action header-action-account flex cursor-pointer list-none items-center gap-2 rounded-md py-2 text-left text-white transition hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] [&::-webkit-details-marker]:hidden">
          {isAuthenticated ? (
            <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--brand-color)] text-[11px] font-bold text-[var(--brand-color)]">
              {getInitials(activeAccount.name)}
            </span>
          ) : (
            <UserRound className="h-5 w-5 shrink-0 text-[var(--brand-color)]" strokeWidth={1.7} />
          )}

          <span className="min-w-0">
            <span className="block max-w-28 truncate text-[11px] font-semibold leading-4 text-white">
              {isAuthenticated ? activeAccount.name : "Minha conta"}
            </span>
            <span className="block text-[9px] font-normal leading-3 text-white/45">
              {isAuthenticated ? "Minha conta" : "Entrar ou cadastrar"}
            </span>
          </span>

          <ChevronDown
            className="ml-1 h-4 w-4 shrink-0 text-white/65 transition group-open/account:rotate-180"
            strokeWidth={1.7}
          />
        </summary>

        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[252px] overflow-hidden rounded-lg border border-white/[0.12] bg-[#101010] p-3 shadow-2xl shadow-black/70">
          <div className="flex items-center gap-3 border-b border-white/[0.08] px-1 pb-3">
            <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--brand-color)] text-xs font-bold text-[var(--brand-color)]">
              {isAuthenticated ? (
                getInitials(activeAccount.name)
              ) : (
                <UserRound className="h-6 w-6" strokeWidth={1.5} />
              )}
            </span>
            <span className="min-w-0">
              <strong className="font-display block truncate text-xs font-semibold text-white">
                {isAuthenticated ? activeAccount.name : "Minha conta"}
              </strong>
              <span className="mt-1 block truncate text-[9px] leading-4 text-white/45">
                {isAuthenticated
                  ? activeAccount.email
                  : "Acesse, gerencie seus pedidos e muito mais."}
              </span>
            </span>
          </div>

          {!isAuthenticated && (
            <div className="grid gap-2 border-b border-white/[0.08] py-3">
              <Link
                href="/login"
                onClick={closeAccountMenu}
                className="font-display flex h-9 w-full items-center justify-center rounded bg-[var(--brand-color)] text-[10px] font-bold uppercase text-black transition hover:bg-[#B7FF23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                onClick={closeAccountMenu}
                className="font-display flex h-9 w-full items-center justify-center rounded border border-[var(--brand-color)]/55 text-[10px] font-bold uppercase text-[var(--brand-color)] transition hover:border-[var(--brand-color)] hover:bg-[var(--brand-color)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
              >
                Cadastrar
              </Link>
            </div>
          )}

          <div className="py-2">
            {(isAuthenticated ? accountItems : guestItems).map(
              ({ label, icon: Icon, href, comingSoon }) => {
                const destination = isAuthenticated ? href : href ? "/login" : null;

                if (destination && !comingSoon) {
                  return (
                    <Link
                      key={label}
                      href={destination}
                      onClick={closeAccountMenu}
                      className="flex w-full items-center gap-2.5 rounded px-1.5 py-1.5 text-left text-[10px] text-white/65 transition hover:bg-white/[0.05] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                    </Link>
                  );
                }

                return (
                  <button
                    key={label}
                    type="button"
                    disabled
                    title={`${label} — em breve`}
                    className="flex w-full cursor-not-allowed items-center gap-2.5 rounded px-1.5 py-1.5 text-left text-[10px] text-white/30"
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <span className="rounded border border-white/10 px-1 py-0.5 text-[7px] uppercase tracking-wide text-white/30">
                      Em breve
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <div className="border-t border-white/[0.08] pt-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center gap-2.5 rounded px-1.5 py-1.5 text-left text-[10px] text-white/65 transition hover:bg-white/[0.04] hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-wait disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                {isSigningOut ? "Saindo..." : "Sair da conta"}
              </button>
            ) : (
              <Link
                href="/login"
                onClick={closeAccountMenu}
                className="flex w-full items-center gap-2.5 rounded px-1.5 py-1.5 text-left text-[10px] text-white/65 transition hover:bg-white/[0.04] hover:text-[var(--brand-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
              >
                <LogIn className="h-4 w-4" strokeWidth={1.5} />
                Entrar na conta
              </Link>
            )}
          </div>
        </div>
      </details>

      <Link
        href="/carrinho"
        aria-label="Carrinho"
        className={`header-action header-cart relative inline-flex h-11 w-11 items-center justify-center transition ${compact ? "text-white/90 hover:text-[var(--brand-color)]" : "text-white hover:text-[var(--brand-color)]"}`}
      >
        <ShoppingCart className="h-6 w-6" strokeWidth={1.8} />
        <CartBadgeCount />
      </Link>
    </div>
  );
}
