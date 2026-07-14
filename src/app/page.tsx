import CategoryStrip from "@/components/CategoryStrip";
import DeliveryBanner from "@/components/DeliveryBanner";
import FeatureBar from "@/components/FeatureBar";
import HeroShowcase from "@/components/HeroShowcase";
import HomeInstitutional from "@/components/HomeInstitutional";
import NewsletterBanner from "@/components/NewsletterBanner";
import Showcase from "@/components/Showcase";
import heroSlides from "@/data/hero-slides.json";
import { getAllProducts } from "@/lib/services/productService";

export default async function HomePage() {
  const produtos = await getAllProducts();

  return (
    <div className="bg-black">
      <CategoryStrip />

      <FeatureBar />

      <HeroShowcase slides={heroSlides} />

      <Showcase produtos={produtos} />

      <DeliveryBanner />

      <HomeInstitutional />

      <NewsletterBanner />
    </div>
  );
}
