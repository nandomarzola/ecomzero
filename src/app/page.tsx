import CategoryStrip from "@/components/CategoryStrip";
import DeliveryBanner from "@/components/DeliveryBanner";
import FeatureBar from "@/components/FeatureBar";
import MarketplaceHighlightBar from "@/components/MarketplaceHighlightBar";
import NewsletterBanner from "@/components/NewsletterBanner";
import HomeProductSection from "@/components/HomeProductSection";
import {
  getNovidades,
  getPromocoes,
  getTopSellers,
} from "@/lib/services/productService";
import { getActiveBanners, getActiveCategories } from "@/lib/services/storeContentService";
import { ManagedBannerSection, ManagedHero } from "@/components/ManagedBanners";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, banners, novidades, promocoes, maisVendidos] = await Promise.all([
    getActiveCategories(),
    getActiveBanners(),
    getNovidades(10),
    getPromocoes(10),
    getTopSellers(10),
  ]);
  const hero = banners.filter((banner) => banner.posicao === "hero_slide");
  const middle = banners.filter((banner) => banner.posicao === "home_middle");
  const bottom = banners.filter((banner) => banner.posicao === "home_bottom");

  return (
    <div className="bg-black">
      <MarketplaceHighlightBar />

      <CategoryStrip categories={categories} />

      <FeatureBar />

      <ManagedHero banners={hero} />

      <HomeProductSection
        title="Novidades"
        products={novidades}
        viewAllHref="/novidades"
        layout="shelf"
        emptyLabel="Em breve, novidades por aqui."
      />

      <ManagedBannerSection banners={middle} position="home_middle" />

      <HomeProductSection
        title="Promoções"
        products={promocoes}
        viewAllHref="/promocoes"
        layout="shelf"
        emptyLabel="Nenhuma promoção ativa no momento."
      />

      <ManagedBannerSection banners={bottom} position="home_bottom" />

      <HomeProductSection
        title="Mais Vendidos"
        products={maisVendidos}
        viewAllHref="/mais-vendidos"
        layout="shelf"
        emptyLabel="Ainda calculando os mais vendidos."
      />

      <DeliveryBanner />

      <NewsletterBanner />
    </div>
  );
}
