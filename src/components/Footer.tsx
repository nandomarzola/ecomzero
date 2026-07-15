import Link from "next/link";
import { ExternalLink, ShieldCheck, ShoppingBag } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { getActiveCategories, getStoreSettings } from "@/lib/services/storeContentService";

const linkClass =
  "text-[11px] text-white/50 transition hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17]";

export default async function Footer() {
  const [allCategories, settings] = await Promise.all([getActiveCategories(), getStoreSettings()]);
  const categories = allCategories.filter((category) => category.depth === 0).slice(0, 8);

  return (
    <footer className="border-t border-white/[0.08] bg-[#080808] text-white">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.45fr_0.8fr_0.9fr_0.8fr_0.95fr] lg:px-10 lg:py-12">
        <div>
          <Link
            href="/"
            aria-label="Ir para o início"
            className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17]"
          >
            <BrandLogo />
          </Link>
          <p className="mt-4 max-w-[250px] text-[11px] leading-5 text-white/50">
            {settings.descricaoFooter}
          </p>
          {settings.linkShopee ? (
          <a
            href={settings.linkShopee}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-[10px] font-semibold text-white/70 transition hover:border-[#A9EC17] hover:text-[#A9EC17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17]"
          >
            <ShoppingBag className="h-4 w-4" />
            Loja oficial na Shopee
            <ExternalLink className="h-3 w-3" />
          </a>
          ) : null}
        </div>

        <nav aria-label="Links institucionais">
          <h2 className="font-display text-[10px] font-bold uppercase tracking-wider text-white">
            Institucional
          </h2>
          <ul className="mt-4 space-y-3">
            <li><Link href="/" className={linkClass}>Início</Link></li>
            <li><Link href="/#sobre" className={linkClass}>Sobre a EcomZero</Link></li>
            <li><Link href="/#vitrine" className={linkClass}>Todos os produtos</Link></li>
          </ul>
        </nav>

        <nav aria-label="Categorias no rodapé">
          <h2 className="font-display text-[10px] font-bold uppercase tracking-wider text-white">
            Categorias
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-1">
            {categories.map((category) => (
              <li key={category.id}>
                <Link href={`/?cat=${category.slug}#vitrine`} className={linkClass}>
                  {category.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Ajuda">
          <h2 className="font-display text-[10px] font-bold uppercase tracking-wider text-white">
            Ajuda
          </h2>
          <ul className="mt-4 space-y-3">
            <li><Link href="/carrinho" className={linkClass}>Meu carrinho</Link></li>
            <li><Link href="/#vitrine" className={linkClass}>Como comprar</Link></li>
            <li><Link href="/#sobre" className={linkClass}>Entrega e segurança</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-[10px] font-bold uppercase tracking-wider text-white">
            Compra protegida
          </h2>
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
            <ShieldCheck className="h-7 w-7 shrink-0 text-[#A9EC17]" strokeWidth={1.5} />
            <div>
              <strong className="font-display block text-[11px] text-white">
                Compra segura
              </strong>
              <span className="mt-1 block text-[10px] leading-4 text-white/45">
                Ambiente protegido para escolher seus produtos.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-5 text-[10px] text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <p>© {new Date().getFullYear()} ECOMZERO. Todos os direitos reservados.</p>
          <p>{settings.mensagemFooter}</p>
        </div>
      </div>
    </footer>
  );
}
