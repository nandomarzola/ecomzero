import type { ReactNode } from "react";
import {
  ExternalLink,
  Handshake,
  Music2,
  ShoppingBag,
  Store,
} from "lucide-react";

type ProductMarketplacesProps = {
  links: {
    shopee: string | null;
    mercadoLivre: string | null;
    tiktokShop: string | null;
    shein: string | null;
  };
};

type Marketplace = {
  name: string;
  url: string | null;
  action: string;
  accent: string;
  icon: ReactNode;
};

export default function ProductMarketplaces({ links }: ProductMarketplacesProps) {
  const marketplaces: Marketplace[] = [
    {
      name: "Shopee",
      url: links.shopee,
      action: "Comprar na Shopee",
      accent: "text-[#FF603F] group-hover:border-[#EE4D2D]/55",
      icon: (
        <span className="relative inline-flex text-[#EE4D2D]">
          <ShoppingBag className="h-7 w-7" strokeWidth={1.8} />
          <span className="absolute inset-x-0 top-[9px] text-center text-[10px] font-bold">S</span>
        </span>
      ),
    },
    {
      name: "Mercado Livre",
      url: links.mercadoLivre,
      action: "Comprar no Mercado Livre",
      accent: "text-[#FFE600] group-hover:border-[#FFE600]/45",
      icon: (
        <span className="inline-flex h-7 w-10 items-center justify-center rounded-[50%] border-2 border-[#2D3277] bg-[#FFE600] text-[#2D3277]">
          <Handshake className="h-6 w-6" strokeWidth={1.6} />
        </span>
      ),
    },
    {
      name: "TikTok Shop",
      url: links.tiktokShop,
      action: "Comprar no TikTok Shop",
      accent: "text-[#61E9E9] group-hover:border-[#4DE8E8]/45",
      icon: (
        <Music2
          className="h-7 w-7 text-white [filter:drop-shadow(-2px_0_0_#25F4EE)_drop-shadow(2px_0_0_#FE2C55)]"
          strokeWidth={2.4}
        />
      ),
    },
    {
      name: "SHEIN",
      url: links.shein,
      action: "Comprar na SHEIN",
      accent: "text-white group-hover:border-white/40",
      icon: <Store className="h-7 w-7 text-white" strokeWidth={1.8} />,
    },
  ];
  const availableMarketplaces = marketplaces.filter(
    (marketplace): marketplace is Marketplace & { url: string } =>
      Boolean(marketplace.url?.trim()),
  );

  if (availableMarketplaces.length === 0) return null;

  return (
    <section
      aria-labelledby="product-marketplaces-title"
      className="mt-5 rounded-xl border border-white/[0.09] bg-[linear-gradient(110deg,#0D0D0D,#111111_55%,#0D0D0D)] p-3 sm:p-4"
    >
      <div className="grid gap-3 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-stretch">
        <div className="flex flex-col justify-center border-b border-white/[0.07] px-1 pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
          <p
            id="product-marketplaces-title"
            className="font-display text-xs font-bold uppercase text-white"
          >
            Compre nos marketplaces
          </p>
          <p className="mt-1 text-[11px] leading-5 text-white/45">
            Canais oficiais disponíveis para este produto.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {availableMarketplaces.map((marketplace) => (
            <a
              key={marketplace.name}
              href={marketplace.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              aria-label={`${marketplace.action}, abre em uma nova aba`}
              className={`group flex min-h-[76px] min-w-[210px] flex-1 items-center gap-3 rounded-lg border border-white/[0.09] bg-[#111111] px-4 py-3 transition duration-[250ms] hover:-translate-y-0.5 hover:bg-[#151515] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9EC17] motion-reduce:transform-none motion-reduce:transition-none ${marketplace.accent}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/35">
                {marketplace.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">
                  {marketplace.name}
                </span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-current">
                  Ver oferta
                </span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-white/35 transition group-hover:text-current" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
