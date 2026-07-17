import type { Metadata } from "next";
import HomeProductSection from "@/components/HomeProductSection";
import { getAllProducts } from "@/lib/services/productService";

export const metadata: Metadata = {
  title: "Todos os produtos",
  description: "Catálogo completo da EcomZero.",
};
export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const products = await getAllProducts();
  return (
    <div className="min-h-screen bg-black">
      <HomeProductSection
        title="Todos os produtos"
        products={products}
        emptyLabel="Nenhum produto disponível no momento."
      />
    </div>
  );
}
