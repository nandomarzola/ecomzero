import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Headphones,
  Info,
  Lock,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import CartItemRow from "@/components/CartItemRow";
import CategoryStrip from "@/components/CategoryStrip";
import PaymentBadges from "@/components/PaymentBadges";
import RelatedProductsCarousel from "@/components/RelatedProductsCarousel";
import TrustBadges from "@/components/TrustBadges";
import { getCart } from "@/lib/services/cartService";
import {
  getAllProducts,
  getOtherProducts,
} from "@/lib/services/productService";
import { getCartSessionId } from "@/lib/session";

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
  const allProducts = await getAllProducts();
  const otherProducts = getOtherProducts(
    allProducts,
    cart.items.map((item) => item.productSlug),
  );
  const productCount = cart.items.length;

  return (
    <div className="min-h-screen bg-[#050505]">
      <CategoryStrip />

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

              <aside className="space-y-3 xl:sticky xl:top-24">
                <section
                  aria-labelledby="order-summary-title"
                  className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5"
                >
                  <h2
                    id="order-summary-title"
                    className="font-display text-lg font-bold text-white"
                  >
                    Resumo do pedido
                  </h2>

                  <dl className="mt-5 space-y-3 text-[13px]">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-white/65">
                        Subtotal ({productCount} {productCount === 1 ? "item" : "itens"})
                      </dt>
                      <dd className="font-medium text-white">
                        {formatPrice(cart.total)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="inline-flex items-center gap-1.5 text-white/65">
                        Frete
                        <Info className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </dt>
                      <dd className="text-white/40">Calcular</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-white/65">Cupom de desconto</dt>
                      <dd className="font-medium text-[#A9EC17]/70">Adicionar</dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex items-center justify-between border-t border-white/[0.09] pt-5">
                    <span className="font-display text-sm font-bold uppercase text-white">
                      Total
                    </span>
                    <strong className="font-display text-[25px] font-extrabold text-[#A9EC17]">
                      {formatPrice(cart.total)}
                    </strong>
                  </div>
                  <p className="mt-1 text-[10px] text-white/38">
                    Frete calculado na próxima etapa.
                  </p>

                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title="Fechamento de pedido ainda não disponível"
                    className="font-display mt-5 flex min-h-[54px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-[#A9EC17]/15 bg-[#A9EC17]/10 px-5 text-xs font-bold uppercase text-white/35"
                  >
                    <Lock className="h-4 w-4" />
                    Finalizar compra
                  </button>
                  <p className="mt-3 flex items-center justify-center gap-2 text-center text-[10px] text-white/35">
                    <Lock className="h-3.5 w-3.5" />
                    Fechamento de pedido ainda não disponível
                  </p>
                </section>

                <section
                  aria-labelledby="shipping-calculator-title"
                  className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5"
                >
                  <h2
                    id="shipping-calculator-title"
                    className="font-display text-sm font-bold text-white"
                  >
                    Calcular frete e prazo
                  </h2>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={9}
                      disabled
                      placeholder="Digite seu CEP"
                      title="Cálculo de frete chega na próxima etapa"
                      aria-label="CEP"
                      className="h-11 min-w-0 flex-1 rounded-md border border-white/15 bg-[#090909] px-3 text-xs text-white outline-none placeholder:text-white/32 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      disabled
                      title="Cálculo de frete chega na próxima etapa"
                      className="h-11 shrink-0 cursor-not-allowed rounded-md bg-[#A9EC17]/20 px-4 text-[10px] font-bold text-white/40"
                    >
                      Calcular
                    </button>
                  </div>
                  <p className="mt-3 text-[10px] text-[#A9EC17]/55">
                    Não sei meu CEP
                  </p>
                </section>

                <section className="rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5">
                  <PaymentBadges />
                </section>
              </aside>
            </div>

            <div className="mt-12 border-t border-white/[0.08] pt-8 sm:mt-14 sm:pt-9">
              <RelatedProductsCarousel
                produtos={otherProducts}
                title="Você também pode gostar"
                eyebrow=""
              />
            </div>

            <div className="fixed inset-x-0 bottom-16 z-40 border-t border-white/10 bg-black/95 px-4 py-3 backdrop-blur md:hidden">
              <div className="mx-auto flex max-w-lg items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] uppercase text-white/40">Total</p>
                  <strong className="font-display text-lg font-extrabold text-[#A9EC17]">
                    {formatPrice(cart.total)}
                  </strong>
                </div>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Fechamento de pedido ainda não disponível"
                  className="font-display min-h-11 flex-1 cursor-not-allowed rounded-md border border-[#A9EC17]/15 bg-[#A9EC17]/10 px-4 text-[10px] font-bold uppercase text-white/35"
                >
                  Finalizar compra
                </button>
              </div>
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
