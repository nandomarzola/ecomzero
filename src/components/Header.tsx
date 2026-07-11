import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import MobileMenu from "@/components/MobileMenu";

const navigation = [
  { label: "Início", href: "/" },
  { label: "Categorias", href: "/#vitrine" },
  { label: "Ofertas", href: "/?f=ofertas#vitrine" },
  { label: "Novidades", href: "/?f=novidades#vitrine" },
  { label: "Mais Vendidos", href: "/?f=mais-vendidos#vitrine" },
  { label: "Sobre a EcomZero", href: "/#sobre" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 text-white backdrop-blur">
      <div className="mx-auto flex min-h-[64px] max-w-[1440px] items-center gap-4 px-4 sm:min-h-[72px] sm:gap-8 sm:px-5 lg:px-8">
        <Link href="/" aria-label="EcomZero — página inicial" className="shrink-0">
          <BrandLogo priority />
        </Link>

        <nav
          className="ml-auto hidden min-w-0 overflow-x-auto [scrollbar-width:none] md:block [&::-webkit-scrollbar]:hidden"
          aria-label="Navegação principal"
        >
          <ul className="flex min-w-max items-center gap-6 lg:gap-10">
            {navigation.map((item, index) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  scroll={!item.href.includes("?")}
                  aria-current={index === 0 ? "page" : undefined}
                  className={`font-display relative py-6 text-xs font-semibold transition hover:text-[#A9EC17] lg:text-sm ${index === 0 ? "text-white after:absolute after:bottom-3 after:left-0 after:h-0.5 after:w-full after:bg-[#A9EC17]" : "text-white/85"}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <MobileMenu items={navigation} />
      </div>
    </header>
  );
}
