import Link from "next/link";

export default function Footer() {
  return (
    <footer id="sobre" className="border-t border-[#3E0808] bg-[#050000] text-white/55">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-8 text-xs sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p>© {new Date().getFullYear()} EcomZero. Todos os direitos reservados.</p>
        <nav aria-label="Navegação do rodapé">
          <ul className="flex gap-6">
            <li>
              <Link href="/#vitrine" className="transition hover:text-[#A9EC17]">
                Produtos
              </Link>
            </li>
            <li>
              <Link href="/#sobre" className="transition hover:text-[#A9EC17]">
                Sobre
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
