import type { Metadata } from "next";
import HomeProductSection from "@/components/HomeProductSection";
import { getBestSellingProducts } from "@/lib/services/productService";

export const metadata: Metadata = {
  title: "Mais Vendidos",
  description: "Os produtos mais vendidos da EcomZero nos últimos 30 dias.",
};
export const dynamic = "force-dynamic";

export default async function MaisVendidosPage() {
  // Janela de 30 dias, igual à home (aqui sem o cache de 1h — página menos acessada).
  const products = await getBestSellingProducts(100, 30);
  return (
    <div className="min-h-screen bg-black">
      <HomeProductSection
        title="Mais Vendidos"
        products={products}
        emptyLabel="Ainda não há vendas suficientes para calcular os mais vendidos."
      />
    </div>
  );
}
