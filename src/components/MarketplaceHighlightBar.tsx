import { Handshake, Music2, ShoppingBag, Store } from "lucide-react";
import { getStoreSettings } from "@/lib/services/storeContentService";
import MarketplaceHighlightBarRotator from "@/components/MarketplaceHighlightBarRotator";

// Ícones genéricos estilizados com a cor oficial de cada marca — mesmo
// tratamento já usado em ProductMarketplaces.tsx, para não depender de um
// logo registrado sem asset licenciado.
export default async function MarketplaceHighlightBar() {
  const settings = await getStoreSettings();

  const marketplaces = [
    settings.shopeeAtivo && settings.linkShopee
      ? {
          name: "Shopee",
          preposition: "na" as const,
          url: settings.linkShopee,
          icon: (
            <span className="relative inline-flex text-[#EE4D2D]">
              <ShoppingBag className="h-4.5 w-4.5" strokeWidth={1.8} />
              <span className="absolute inset-x-0 top-[6px] text-center text-[7px] font-bold">S</span>
            </span>
          ),
        }
      : null,
    settings.mercadoLivreAtivo && settings.linkMercadoLivre
      ? {
          name: "Mercado Livre",
          preposition: "no" as const,
          url: settings.linkMercadoLivre,
          icon: (
            <span className="inline-flex h-5 w-7 items-center justify-center rounded-[50%] border-2 border-[#2D3277] bg-[#FFE600] text-[#2D3277]">
              <Handshake className="h-3.5 w-3.5" strokeWidth={1.6} />
            </span>
          ),
        }
      : null,
    settings.tiktokShopAtivo && settings.linkTiktokShop
      ? {
          name: "TikTok Shop",
          preposition: "no" as const,
          url: settings.linkTiktokShop,
          icon: (
            <Music2
              className="h-4.5 w-4.5 text-white [filter:drop-shadow(-1.5px_0_0_#25F4EE)_drop-shadow(1.5px_0_0_#FE2C55)]"
              strokeWidth={2.4}
            />
          ),
        }
      : null,
    settings.sheinAtivo && settings.linkShein
      ? {
          name: "Shein",
          preposition: "na" as const,
          url: settings.linkShein,
          icon: <Store className="h-4.5 w-4.5 text-white" strokeWidth={1.8} />,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (marketplaces.length === 0) return null;

  return <MarketplaceHighlightBarRotator marketplaces={marketplaces} />;
}
