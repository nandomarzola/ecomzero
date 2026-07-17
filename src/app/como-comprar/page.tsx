import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, PackageCheck, Search, ShoppingCart, Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "Como comprar",
  description: "Passo a passo para comprar na EcomZero.",
};

const steps = [
  { icon: Search, title: "Encontre o produto", text: "Use a busca no topo ou navegue pelas categorias para achar o que precisa." },
  { icon: ShoppingCart, title: "Adicione ao carrinho", text: "Escolha a variação (quando houver) e adicione a quantidade desejada." },
  { icon: Truck, title: "Calcule o frete", text: "Informe seu CEP no carrinho para ver as opções de entrega e o prazo." },
  { icon: CreditCard, title: "Finalize o pagamento", text: "Pague com segurança via Pix, boleto ou cartão pelo Mercado Pago." },
  { icon: PackageCheck, title: "Acompanhe o pedido", text: "Você recebe a confirmação e o código de rastreio assim que o envio for postado." },
];

export default function ComoComprarPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <header className="mb-8">
          <span className="mb-3 block h-0.5 w-11 bg-[var(--brand-color)]" />
          <h1 className="font-display text-2xl font-bold uppercase text-white sm:text-3xl">Como comprar</h1>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Comprar na EcomZero é rápido e seguro. Veja o passo a passo:
          </p>
        </header>

        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-xl border border-white/[0.1] bg-[#0D0D0D] p-5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)]/12 text-[var(--brand-color)]">
                <step.icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  {index + 1}. {step.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-white/55">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-xl border border-white/[0.08] bg-[#0D0D0D] p-5 text-sm leading-6 text-white/55">
          Ainda com dúvidas? Comece explorando{" "}
          <Link href="/produtos" className="text-[var(--brand-color)] hover:underline">todos os produtos</Link>{" "}
          ou fale com nosso atendimento.
        </div>
      </div>
    </div>
  );
}
