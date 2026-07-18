"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2X2, Home, Info, ShoppingCart, UserRound } from "lucide-react";
import CartBadgeCount from "@/components/CartBadgeCount";
import { useCart } from "@/components/CartProvider";

// usePathname() não é uma Dynamic API (ao contrário de useSearchParams()) —
// não exige Suspense nem tira "/" da geração estática.
const tabs = [
  { label: "Início", href: "/", icon: Home, matchExact: true },
  { label: "Categorias", href: "/categorias", icon: Grid2X2, matchExact: false },
  { label: "Carrinho", href: "/carrinho", icon: ShoppingCart, matchExact: true },
  { label: "Conta", href: "/conta/pedidos", icon: UserRound, matchExact: false },
  { label: "Sobre", href: "/#sobre", icon: Info, matchExact: false },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { openCart } = useCart();

  // No checkout o foco é um único objetivo por tela (CTA sticky próprio). A barra
  // inferior de navegação só atrapalharia e sobreporia o CTA — some no mobile.
  // (BottomNav já é md:hidden, então o desktop nunca a mostrou de qualquer forma.)
  if (pathname.startsWith("/checkout")) return null;

  return (
    <nav
      aria-label="Navegação principal (mobile)"
      className="site-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {tabs.map(({ label, href, icon: Icon, matchExact }) => {
          const isActive = matchExact
            ? pathname === href
            : href.startsWith("/conta/") && pathname.startsWith("/conta/");
          const isCarrinho = label === "Carrinho";

          return (
            <li key={label} className="flex-1">
              {isCarrinho ? (
                <button
                  type="button"
                  onClick={openCart}
                  className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-white/60 transition hover:text-white"
                  aria-label="Abrir carrinho"
                >
                  <span className="relative">
                    <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
                    <CartBadgeCount />
                  </span>
                  {label}
                </button>
              ) : (
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                    isActive ? "text-[var(--brand-color)]" : "text-white/60 hover:text-white"
                  }`}
                >
                  <span className="relative">
                    <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
                  </span>
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
