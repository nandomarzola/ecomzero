import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, MapPinCheck, PackageCheck, Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "Entrega e segurança",
  description: "Saiba como funcionam entrega, rastreio e segurança na EcomZero.",
};

const deliverySteps = [
  {
    icon: MapPinCheck,
    title: "Frete calculado pelo CEP",
    text: "As opções disponíveis, o valor e a estimativa de prazo aparecem antes do pagamento.",
  },
  {
    icon: CreditCard,
    title: "Pagamento seguro",
    text: "Pix e cartão são processados pelo Mercado Pago; a EcomZero não armazena os dados do seu cartão.",
  },
  {
    icon: PackageCheck,
    title: "Preparação do pedido",
    text: "Depois da confirmação do pagamento, o pedido segue para separação e envio.",
  },
  {
    icon: Truck,
    title: "Acompanhamento da entrega",
    text: "Quando houver código de rastreio, ele fica disponível para acompanhar o transporte.",
  },
];

export default function EntregaSeguraPage() {
  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <header>
          <span className="mb-3 block h-0.5 w-11 bg-[var(--brand-color)]" />
          <h1 className="font-display text-2xl font-bold uppercase text-white sm:text-3xl">
            Entrega e segurança
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Veja como protegemos o pagamento e como o pedido avança até a
            entrega.
          </p>
        </header>

        <ol className="mt-8 space-y-4">
          {deliverySteps.map(({ icon: Icon, title, text }, index) => (
            <li
              key={title}
              className="flex gap-4 rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)]/10 text-[var(--brand-color)]">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  {index + 1}. {title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-white/55">{text}</p>
              </div>
            </li>
          ))}
        </ol>

        <aside className="mt-8 rounded-xl border border-white/[0.08] bg-[#0D0D0D] p-5 text-sm leading-6 text-white/55">
          O prazo exibido é uma estimativa da transportadora e começa após a
          confirmação do pagamento. Para iniciar uma compra, veja{" "}
          <Link href="/produtos" className="text-[var(--brand-color)] hover:underline">
            todos os produtos
          </Link>
          .
        </aside>
      </main>
    </div>
  );
}
