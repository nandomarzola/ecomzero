"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Accessibility, ShoppingCart } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import CartBadgeCount from "@/components/CartBadgeCount";
import { useCart } from "@/components/CartProvider";
import HeaderActions from "@/components/HeaderActions";
import HeaderCepButton from "@/components/HeaderCepButton";
import MobileMenu from "@/components/MobileMenu";
import SearchBar from "@/components/SearchBar";

const navigation = [
  { label: "Início", href: "/" },
  { label: "Categorias", href: "/#vitrine" },
  { label: "Sobre a EcomZero", href: "/#sobre" },
];

export default function Header({ logoUrl, storeName }: { logoUrl?: string; storeName?: string }) {
  const pathname = usePathname();
  const { openCart } = useCart();
  const isProductPage = pathname.startsWith("/produto/");
  const isHomePage = pathname === "/";
  const isCartPage = pathname === "/carrinho";
  const isRegistrationPage = pathname === "/cadastro";
  const isLoginPage = pathname === "/login";
  const isCheckoutPage = pathname.startsWith("/checkout");
  const usesStorefrontHeader =
    isHomePage ||
    isProductPage ||
    isRegistrationPage ||
    isLoginPage ||
    isCheckoutPage;

  return (
    <header
      className={`site-header sticky top-0 z-50 border-b border-white/10 bg-black/95 text-white backdrop-blur ${usesStorefrontHeader ? "bg-[#030303]/95" : ""}`}
    >
      <div className={`header-accent-strip h-1 bg-[#B01818] ${usesStorefrontHeader ? "hidden" : ""}`} />

      <div className="header-mobile flex min-h-[64px] items-center gap-4 px-4 md:hidden">
        <Link href="/" aria-label={`${storeName ?? "EcomZero"} — página inicial`} className="relative z-[1] shrink-0">
          <BrandLogo priority src={logoUrl} name={storeName} />
        </Link>
        <button
          type="button"
          onClick={openCart}
          aria-label="Carrinho"
          className="relative ml-auto inline-flex h-11 w-11 items-center justify-center text-white transition hover:text-[var(--brand-color)]"
        >
          <ShoppingCart className="h-6 w-6" strokeWidth={1.8} />
          <CartBadgeCount />
        </button>
        <MobileMenu items={navigation} />
      </div>

      {usesStorefrontHeader && (
        <div className="flex flex-col gap-2 px-4 pb-3 md:hidden">
          <SearchBar />
          <HeaderCepButton />
        </div>
      )}

      <div
        className={`header-desktop mx-auto hidden items-center md:flex ${usesStorefrontHeader ? "min-h-[76px] max-w-[1440px] gap-7 px-6 py-3 lg:px-8" : "max-w-[1440px] gap-6 px-5 py-3 lg:px-8"}`}
      >
        <Link href="/" aria-label={`${storeName ?? "EcomZero"} — página inicial`} className="relative z-[1] shrink-0">
          <BrandLogo priority src={logoUrl} name={storeName} />
        </Link>

        <button
          type="button"
          title="Recursos de acessibilidade — em breve"
          aria-label="Recursos de acessibilidade"
          className={`header-accessibility shrink-0 text-[var(--brand-color)] transition hover:brightness-110 ${usesStorefrontHeader ? "hidden" : ""}`}
        >
          <Accessibility className="h-6 w-6" strokeWidth={1.8} />
        </button>

        <div className={usesStorefrontHeader ? "header-search max-w-[660px] flex-1" : "header-search max-w-xl flex-1"}>
          <SearchBar />
        </div>

        <HeaderActions />
      </div>

      <nav
        aria-label="Navegação principal"
        className={`header-nav mx-auto items-center ${usesStorefrontHeader || isCartPage ? "hidden" : "hidden max-w-[1440px] gap-6 border-t border-white/10 px-5 py-2 md:flex lg:gap-10 lg:px-8"}`}
      >
        {navigation.map((item, index) => (
          <Link
            key={item.label}
            href={item.href}
            scroll={!item.href.includes("?")}
            aria-current={index === 0 ? "page" : undefined}
            className="font-display text-xs font-semibold text-white/70 transition hover:text-[var(--brand-color)]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
