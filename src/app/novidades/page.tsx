import type { Metadata } from "next";
import HomeProductSection from "@/components/HomeProductSection";
import { getNovidades } from "@/lib/services/productService";

export const metadata: Metadata = {
  title: "Novidades",
  description: "Os produtos mais recentes da EcomZero.",
};
export const dynamic = "force-dynamic";

export default async function NovidadesPage() {
  const products = await getNovidades(500);
  return (
    <div className="min-h-screen bg-black">
      <HomeProductSection
        title="Novidades"
        products={products}
        emptyLabel="Nenhum produto marcado como novidade ainda."
      />
    </div>
  );
}
