import { Suspense } from "react";
import CategoryStrip from "@/components/CategoryStrip";
import DeliveryBanner from "@/components/DeliveryBanner";
import FeatureBar from "@/components/FeatureBar";
import HeroShowcase from "@/components/HeroShowcase";
import Showcase from "@/components/Showcase";
import homeData from "@/data/home.json";

export default function HomePage() {
  return (
    <div className="bg-black">
      <Suspense
        fallback={<div className="h-20 border-y border-[#360808] bg-[#080000]" />}
      >
        <CategoryStrip />
      </Suspense>

      <HeroShowcase slides={homeData.slides} />

      <div className="relative z-10 -mt-1 pb-4">
        <FeatureBar />
      </div>

      <Suspense fallback={<div className="min-h-[480px]" />}>
        <Showcase />
      </Suspense>

      <DeliveryBanner />
    </div>
  );
}
