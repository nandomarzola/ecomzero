"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";

import ProductCard from "@/components/ProductCard";
import homeData from "@/data/home.json";
import categoriasData from "@/data/categorias.json";

const badgeMap: Record<string, string[]> = {
  ofertas: ["OFERTA"],
  novidades: ["NOVIDADE", "EDIÇÃO LIMITADA"],
  "mais-vendidos": ["MAIS VENDIDO"],
};

const filterLabels: Record<string, string> = {
  ofertas: "Ofertas",
  novidades: "Novidades",
  "mais-vendidos": "Mais vendidos",
};

export default function Showcase() {
  const searchParams = useSearchParams();
  const cat = searchParams.get("cat");
  const filtro = searchParams.get("f");
  const sectionRef = useRef<HTMLElement | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!cat && !filtro) return;

    const el = sectionRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const currentTop = window.scrollY + rect.top;
    const headerOffset = 88;
    window.scrollTo({
      top: Math.max(0, currentTop - headerOffset),
      behavior: "smooth",
    });
  }, [cat, filtro]);

  let produtos = homeData.produtos;
  let titulo = "Todos os produtos";
  let subtitulo: ReactNode = (
    <>
      Selecionamos os{" "}
      <strong className="text-[#A9EC17]">melhores produtos</strong> para
      facilitar sua vida.
    </>
  );

  if (filtro && badgeMap[filtro]) {
    const badges = badgeMap[filtro];
    produtos = produtos.filter(
      (produto) => produto.badge && badges.includes(produto.badge),
    );
    titulo = filterLabels[filtro];
    subtitulo = (
      <>
        Confira os itens em{" "}
        <strong className="text-[#A9EC17]">
          {filterLabels[filtro].toLowerCase()}
        </strong>
        .
      </>
    );
  } else if (cat && cat !== "tudo") {
    const catInfo = categoriasData.categorias.find(
      (item) => item.id === cat,
    );
    produtos = produtos.filter((produto) => produto.categoria === cat);
    titulo = catInfo?.label ?? cat;
    subtitulo = (
      <>
        Produtos da categoria{" "}
        <strong className="text-[#A9EC17]">
          {catInfo?.label ?? cat}
        </strong>
        .
      </>
    );
  }

  const hasFilter = Boolean((cat && cat !== "tudo") || filtro);

  return (
    <section
      id="vitrine"
      ref={sectionRef}
      className="mx-auto max-w-[1360px] scroll-mt-24 px-4 py-10 sm:px-5 sm:py-16 lg:px-8 lg:py-20"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold uppercase text-white sm:text-3xl">
            {titulo}
          </h2>
          <p className="mt-2 text-xs text-white/65 sm:text-sm">{subtitulo}</p>
        </div>
        {hasFilter && (
          <Link
            href="/#vitrine"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 transition hover:border-[#A9EC17] hover:text-[#A9EC17] sm:text-sm"
          >
            <XCircle className="h-4 w-4" />
            Limpar filtro
          </Link>
        )}
      </div>

      {produtos.length === 0 ? (
        <div className="rounded-xl border border-[#4D0B0B] bg-[#0A0101] px-6 py-10 text-center text-sm text-white/70">
          Nenhum produto encontrado nessa seleção.{" "}
          <Link href="/#vitrine" className="text-[#A9EC17] hover:underline">
            Ver todos
          </Link>
          .
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {produtos.map((produto) => (
            <ProductCard key={produto.id} product={produto} />
          ))}
        </div>
      )}
    </section>
  );
}
