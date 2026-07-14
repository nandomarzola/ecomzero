import type { Metadata } from "next";
import ProductForm from "@/components/produtos/ProductForm";

export const metadata: Metadata = { title: "Novo produto" };

export default function NovoProdutoPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold text-white">Novo produto</h1>
      <ProductForm mode="create" />
    </div>
  );
}
