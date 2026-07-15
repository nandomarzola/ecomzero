import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Headphones,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import CartCheckoutPanel from "@/components/CartCheckoutPanel";
import CartItemRow from "@/components/CartItemRow";
import CategoryStrip from "@/components/CategoryStrip";
import RelatedProductsCarousel from "@/components/RelatedProductsCarousel";
import TrustBadges from "@/components/TrustBadges";
import { getCart } from "@/lib/services/cartService";
import {
  getAllProducts,
  getOtherProducts,
} from "@/lib/services/productService";
import { getCartSessionId } from "@/lib/session";
import { getActiveCategories } from "@/lib/services/storeContentService";

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false, follow: false },
};

const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const trustBadges = [
  {
    icon: ShieldCheck,
    title: "Compra 100% segura",
    detail: "Seus dados protegidos",
  },
  {
    icon: Truck,
    title: "Envio rápido",
    detail: "Para todo o Brasil",
  },
  {
    icon: RefreshCw,
    title: "Troca garantida",
    detail: "Até 7 dias após o recebimento",
  },
  {
    icon: Headphones,
    title: "Atendimento humano",
    detail: "Suporte rápido e dedicado",
  },
];

export default async function CartPage() {
  const sessionId = await getCartSessionId();
  const cart = await getCart(sessionId);
  const [allProducts, categories] = await Promise.all([getAllProducts(), getActiveCategories()]);
  const otherProducts = getOtherProducts(
    allProducts,
    cart.items.map((item) => item.productSlug),
  );
  const productCount = cart.items.length;

  return (
    <div className="min-h-screen bg-[#050505]">
      <CategoryStrip categories={categories} />

      <div className="mx-auto max-w-[1320px] px-4 pb-36 pt-5 sm:px-6 sm:pt-6 md:pb-16 lg:px-8">
        <nav
          aria-label="Navegação estrutural"
          className="flex items-center gap-2 text-[11px] text-white/42 sm:text-xs"
        >
          <Link href="/" className="transition hover:text-[#A9EC17]">
            Início
          </Link>
          <span>/</span>
          <span className="text-white/70">Carrinho</span>
        </nav>

        <header className="pb-5 pt-7 sm:pb-6 sm:pt-8">
          <Link
            href="/#vitrine"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#A9EC17] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Continuar comprando
          </Link>
          <h1 className="font-display mt-3 text-[30px] font-extrabold leading-tight text-white sm:text-[38px]">
            Seu carrinho
          </h1>
          {productCount > 0 && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/55">
              <span>
                {productCount} {productCount === 1 ? "produto" : "produtos"}
              </span>
              <span>
                Total parcial: {" "}
                <strong className="font-display text-base font-bold text-[#A9EC17]">
                  {formatPrice(cart.total)}
                </strong>
              </span>
            </p>
          )}
        </header>

        {productCount === 0 ? (
          <section className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] px-6 py-16 text-center">
            <p className="text-sm text-white/65">Seu carrinho está vazio.</p>
            <Link
              href="/#vitrine"
              className="font-display mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-[#A9EC17] px-6 text-xs font-bold uppercase text-black transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Ver produtos
            </Link>
          </section>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
              <section aria-label="Produtos no carrinho" className="min-w-0">
                <div className="space-y-1.5">
                  {cart.items.map((item) => (
                    <CartItemRow key={item.id} item={item} />
                  ))}
                </div>

                <TrustBadges
                  items={trustBadges}
                  className="mt-4 grid-cols-2 lg:grid-cols-4"
                />
              </section>

              <CartCheckoutPanel
                subtotal={cart.total}
                productCount={productCount}
              />
            </div>

            <div className="mt-12 border-t border-white/[0.08] pt-8 sm:mt-14 sm:pt-9">
              <RelatedProductsCarousel
                produtos={otherProducts}
                title="Você também pode gostar"
                eyebrow=""
              />
            </div>

          </>
        )}

        {productCount === 0 && (
          <div className="mt-12 border-t border-white/[0.08] pt-8">
            <RelatedProductsCarousel
              produtos={otherProducts}
              title="Você também pode gostar"
              eyebrow=""
            />
          </div>
        )}
      </div>
    </div>
  );
}
