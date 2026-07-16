"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  LoaderCircle,
  PackageOpen,
  ShoppingCart,
  X,
} from "lucide-react";
import { useCart } from "@/components/CartProvider";
import CartDrawerCoupon from "@/components/cart/CartDrawerCoupon";
import CartDrawerItem from "@/components/cart/CartDrawerItem";
import CartDrawerShipping from "@/components/cart/CartDrawerShipping";
import CartDrawerSummary from "@/components/cart/CartDrawerSummary";
import {
  getCheckoutShippingSnapshot,
  isCheckoutShippingExpired,
  parseCheckoutShippingSelection,
  subscribeCheckoutShippingSelection,
} from "@/lib/client/checkoutShippingStorage";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function CartDrawer() {
  const router = useRouter();
  const {
    cart,
    isOpen,
    isLoading,
    isMutating,
    addedMessageVisible,
    closeCart,
    dismissAddedMessage,
  } = useCart();
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const storedShippingRaw = useSyncExternalStore(
    subscribeCheckoutShippingSelection,
    getCheckoutShippingSnapshot,
    () => null,
  );
  const storedShipping = useMemo(
    () => parseCheckoutShippingSelection(storedShippingRaw),
    [storedShippingRaw],
  );
  const shippingSelection =
    storedShipping &&
    Math.abs(storedShipping.cartSubtotal - cart.subtotal) < 0.005 &&
    !isCheckoutShippingExpired(storedShipping, now)
      ? storedShipping
      : null;
  const shippingPrice = shippingSelection?.preco ?? null;
  const freeShipping = cart.coupon?.freeShipping ?? false;
  const total =
    cart.total + (shippingPrice ?? 0) - (freeShipping ? shippingPrice ?? 0 : 0);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 30);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCart();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => !element.hasAttribute("disabled"));
      const first = focusableElements[0];
      const last = focusableElements.at(-1);
      if (!first || !last) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previousFocusRef.current?.focus();
    };
  }, [closeCart, isOpen]);

  const goToCheckout = () => {
    if (!shippingSelection) {
      setCheckoutError("Calcule o frete e selecione uma opção para continuar.");
      document.getElementById("drawer-shipping-cep")?.focus();
      return;
    }
    setCheckoutError("");
    closeCart();
    router.push("/checkout");
  };

  return (
    <div
      className={`fixed inset-0 z-[100] transition-[visibility] duration-300 motion-reduce:transition-none ${isOpen ? "visible" : "invisible pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar carrinho"
        onClick={closeCart}
        className={`absolute inset-0 bg-black/75 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none ${isOpen ? "opacity-100" : "opacity-0"}`}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho de compras"
        tabIndex={-1}
        className={`absolute inset-y-0 right-0 flex w-[92vw] max-w-[450px] flex-col border-l border-white/[0.12] bg-[#090909] text-white shadow-[-24px_0_70px_rgba(0,0,0,0.65)] transition-transform duration-300 ease-out motion-reduce:transition-none sm:w-[450px] ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex min-h-[72px] shrink-0 items-center gap-3 border-b border-white/[0.1] px-4 pt-[env(safe-area-inset-top)] sm:px-5">
          <ShoppingCart className="h-6 w-6 text-white" strokeWidth={1.7} />
          <span className="min-w-0 flex-1">
            <strong className="block text-sm font-bold uppercase tracking-[0.03em] text-white">
              Carrinho
            </strong>
            <span className="mt-0.5 block text-[10px] font-medium text-[var(--brand-color)]" aria-live="polite">
              {cart.itemCount} {cart.itemCount === 1 ? "item" : "itens"}
            </span>
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeCart}
            className="flex h-10 w-10 items-center justify-center rounded-md text-white/70 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]"
            aria-label="Fechar carrinho"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div
          className={`pointer-events-none absolute left-4 right-4 top-[82px] z-20 flex items-center gap-2 rounded-md border border-[var(--brand-color)]/20 bg-[#11180B]/95 px-3 py-2.5 text-[10px] text-white shadow-xl transition-all duration-200 ${addedMessageVisible && isOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
          role="status"
          aria-live="polite"
          aria-hidden={!addedMessageVisible}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--brand-color)]" />
          Produto adicionado ao carrinho!
          <button
            type="button"
            tabIndex={-1}
            onClick={dismissAddedMessage}
            className="pointer-events-auto ml-auto text-white/50 hover:text-white"
            aria-label="Ocultar confirmação"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-[var(--brand-color)]" aria-label="Carregando carrinho" />
          </div>
        ) : cart.items.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.03]">
              <PackageOpen className="h-7 w-7 text-white/35" />
            </span>
            <h2 className="mt-5 text-base font-bold text-white">Seu carrinho está vazio</h2>
            <p className="mt-2 max-w-[260px] text-xs leading-5 text-white/45">
              Explore nossos produtos e adicione seus favoritos.
            </p>
            <button
              type="button"
              onClick={closeCart}
              className="store-primary-action mt-5 min-h-11 px-6 text-[11px] font-bold uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Continuar comprando
            </button>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 sm:px-5">
              <section aria-label="Produtos no carrinho">
                {cart.items.map((item) => (
                  <CartDrawerItem key={item.id} item={item} />
                ))}
              </section>
              <CartDrawerCoupon />
              <CartDrawerShipping subtotal={cart.subtotal} />
              {checkoutError ? (
                <p role="alert" className="pb-2 text-[10px] leading-4 text-amber-300">
                  {checkoutError}
                </p>
              ) : null}
            </div>

            <CartDrawerSummary
              subtotal={cart.subtotal}
              discount={cart.discount}
              shippingPrice={shippingPrice}
              freeShipping={freeShipping}
              total={total}
              isPending={isMutating}
              onCheckout={goToCheckout}
              onContinue={closeCart}
            />
          </>
        )}
      </aside>
    </div>
  );
}
