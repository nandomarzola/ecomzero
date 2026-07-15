import CategoryStrip from "@/components/CategoryStrip";
import CepCaptureModal from "@/components/CepCaptureModal";
import DeliveryBanner from "@/components/DeliveryBanner";
import FeatureBar from "@/components/FeatureBar";
import HomeInstitutional from "@/components/HomeInstitutional";
import NewsletterBanner from "@/components/NewsletterBanner";
import Showcase from "@/components/Showcase";
import {
  getAllProducts,
  getBestSellingProducts,
  getLatestProducts,
} from "@/lib/services/productService";
import { getActiveBanners, getActiveCategories } from "@/lib/services/storeContentService";
import { ManagedBannerSection, ManagedHero } from "@/components/ManagedBanners";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [produtos, categories, banners, bestSellers, releases] = await Promise.all([
    getAllProducts(),
    getActiveCategories(),
    getActiveBanners(),
    getBestSellingProducts(),
    getLatestProducts(),
  ]);
  const hero = banners.filter((banner) => banner.posicao === "hero_slide");
  const middle = banners.filter((banner) => banner.posicao === "home_middle");
  const bottom = banners.filter((banner) => banner.posicao === "home_bottom");

  return (
    <div className="bg-black">
      <CepCaptureModal />

      <CategoryStrip categories={categories} />

      <FeatureBar />

      <ManagedHero banners={hero} />

      <Showcase
        produtos={produtos}
        categories={categories}
        bestSellers={bestSellers}
        releases={releases}
      />

      <ManagedBannerSection banners={middle} position="home_middle" />

      <DeliveryBanner />

      <HomeInstitutional />

      <ManagedBannerSection banners={bottom} position="home_bottom" />

      <NewsletterBanner />
    </div>
  );
}
