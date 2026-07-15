import type { Metadata } from "next";
import Link from "next/link";
import {
  Headphones,
  Package,
  RefreshCw,
  ShieldCheck,
  Tag,
  Truck,
  Zap,
} from "lucide-react";
import CategoryStrip from "@/components/CategoryStrip";
import RegistrationForm from "@/components/RegistrationForm";
import TrustBadges from "@/components/TrustBadges";
import { getActiveCategories } from "@/lib/services/storeContentService";

export const metadata: Metadata = {
  title: "Cadastro",
  description: "Crie sua conta EcomZero.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const benefits = [
  {
    icon: ShieldCheck,
    title: "Compra 100% segura",
    detail: "Seus dados protegidos com criptografia de ponta.",
  },
  {
    icon: Tag,
    title: "Ofertas exclusivas",
    detail: "Descontos e promoções apenas para clientes.",
  },
  {
    icon: Package,
    title: "Acompanhe seus pedidos",
    detail: "Veja o status e histórico das suas compras.",
  },
  {
    icon: Headphones,
    title: "Atendimento humanizado",
    detail: "Suporte rápido e dedicado sempre que precisar.",
  },
  {
    icon: Zap,
    title: "Compra mais rápida",
    detail: "Seus dados ficam salvos para facilitar novos pedidos.",
  },
];

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

export default async function RegistrationPage() {
  const categories = await getActiveCategories();
  return (
    <div className="bg-[#050505]">
      <CategoryStrip categories={categories} />

      <div className="mx-auto max-w-[1320px] px-4 pb-12 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-16">
        <nav
          aria-label="Navegação estrutural"
          className="flex items-center gap-2 text-[11px] text-white/42 sm:text-xs"
        >
          <Link href="/" className="transition hover:text-[#A9EC17]">
            Início
          </Link>
          <span aria-hidden="true">›</span>
          <span className="text-white/70">Cadastro</span>
        </nav>

        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] lg:items-stretch">
          <RegistrationForm />

          <aside
            aria-labelledby="registration-benefits-title"
            className="rounded-xl border border-white/[0.12] bg-[linear-gradient(145deg,#101010,#0B0B0B)] p-6 sm:p-8 lg:p-10"
          >
            <h2
              id="registration-benefits-title"
              className="font-display max-w-[360px] text-xl font-bold leading-snug text-white"
            >
              Ao criar sua conta, você tem muito mais vantagens
            </h2>

            <ul className="mt-9 grid gap-7 sm:grid-cols-2 lg:grid-cols-1 lg:gap-9">
              {benefits.map(({ icon: Icon, title, detail }) => (
                <li key={title} className="flex items-start gap-5">
                  <Icon
                    className="mt-0.5 h-11 w-11 shrink-0 text-[#A9EC17] sm:h-12 sm:w-12"
                    strokeWidth={1.55}
                  />
                  <div className="min-w-0 pt-0.5">
                    <h3 className="font-display text-sm font-bold text-white sm:text-base">
                      {title}
                    </h3>
                    <p className="mt-2 max-w-[270px] text-xs leading-5 text-white/55 sm:text-sm sm:leading-6">
                      {detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <TrustBadges
          items={trustBadges}
          className="mt-6 grid-cols-2 lg:grid-cols-4"
        />
      </div>
    </div>
  );
}
