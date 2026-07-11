import { ArrowRightCircle } from "lucide-react";
import CategoryStrip from "@/components/CategoryStrip";
import DeliveryBanner from "@/components/DeliveryBanner";
import FeatureBar from "@/components/FeatureBar";
import HeroShowcase from "@/components/HeroShowcase";
import ProductCard from "@/components/ProductCard";
import homeData from "@/data/home.json";

export default function HomePage() {
  return (
    <div className="bg-black">
      <CategoryStrip />
      <HeroShowcase slides={homeData.slides} />

      <div className="relative z-10 -mt-1 pb-4">
        <FeatureBar />
      </div>

      <section id="vitrine" className="mx-auto max-w-[1440px] px-5 py-10 lg:px-8 lg:py-14">
        <div className="mb-7 flex items-end justify-between gap-5">
          <div>
            <h2 className="font-display text-2xl font-bold uppercase text-white sm:text-3xl">
              Vitrine EcomZero
            </h2>
            <p className="mt-2 text-sm text-white/65">
              Selecionamos os <strong className="text-[#A9EC17]">melhores produtos</strong>{" "}
              para facilitar sua vida.
            </p>
          </div>
          <a
            href="#vitrine"
            className="hidden items-center gap-3 text-sm text-white/75 transition hover:text-[#A9EC17] sm:flex"
          >
            Ver todos
            <ArrowRightCircle className="h-6 w-6 text-[#A9EC17]" strokeWidth={1.5} />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {homeData.produtos.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <DeliveryBanner />
    </div>
  );
}
