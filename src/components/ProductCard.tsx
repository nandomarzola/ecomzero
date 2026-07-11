import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import homeData from "@/data/home.json";

type Product = (typeof homeData.produtos)[number];

type ProductCardProps = {
  product: Product;
};

const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#6B1010] bg-[#080101] transition hover:-translate-y-1 hover:border-[#A9EC17]/60 hover:shadow-[0_14px_35px_rgba(89,0,0,0.28)]">
      <Link href={product.href} className="relative block aspect-[1/0.95] overflow-hidden bg-[radial-gradient(circle_at_50%_65%,#4B0B08,#170202_58%,#080101)]">
        <Image
          src={product.imagem}
          alt={product.nome}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 20vw"
          className="object-cover mix-blend-screen transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_58%,rgba(8,1,1,0.68)_100%)]" />
        {product.badge && (
          <span className="absolute bottom-2 left-3 rounded-full bg-[#A9EC17] px-3 py-1 text-[9px] font-extrabold text-black">
            {product.badge}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col border-t border-[#5F0E0E] p-3 sm:p-4">
        <h3 className="font-display truncate text-xs font-semibold text-white sm:text-sm">
          {product.nome}
        </h3>
        <p className="mt-1 truncate text-[10px] text-white/60 sm:text-[11px]">{product.subtitulo}</p>

        <div className="mt-2 flex items-center gap-1">
          {Array.from({ length: product.avaliacao }).map((_, index) => (
            <Star key={index} className="h-3 w-3 fill-[#EAFB00] text-[#EAFB00]" />
          ))}
          <span className="ml-1 text-[10px] text-white/55">({product.reviews})</span>
        </div>

        <div className="mt-auto flex flex-col items-stretch gap-2 pt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <strong className="font-display whitespace-nowrap text-base font-bold text-white sm:text-lg">
            {formatPrice(product.preco)}
          </strong>
          <Link
            href={product.href}
            aria-label={`Ver produto ${product.nome}`}
            className="font-display inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg bg-[#A9EC17] px-3 text-[10px] font-extrabold text-black transition hover:scale-[1.03] hover:brightness-110"
          >
            VER PRODUTO
          </Link>
        </div>
      </div>
    </article>
  );
}
