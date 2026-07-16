import type { Metadata } from "next";
import HomeProductSection from "@/components/HomeProductSection";
import { getPromocoes } from "@/lib/services/productService";

export const metadata: Metadata = {
  title: "Promoções",
  description: "Produtos em promoção na EcomZero.",
};
export const dynamic = "force-dynamic";

export default async function PromocoesPage() {
  const products = await getPromocoes(500);
  return (
    <div className="min-h-screen bg-black">
      <HomeProductSection
        title="Promoções"
        products={products}
        variant="promo"
        emptyLabel="Nenhuma promoção ativa no momento."
      />
    </div>
  );
}
