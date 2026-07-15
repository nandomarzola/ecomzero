import type { Metadata } from "next";
import ProductForm from "@/components/produtos/ProductForm";
import { listCategories } from "@/lib/services/categoryAdminService";

export const metadata: Metadata = { title: "Novo produto" };

export const dynamic = "force-dynamic";

export default async function NovoProdutoPage() {
  const categories = await listCategories();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold text-white">Novo produto</h1>
      <ProductForm mode="create" categories={categories} />
    </div>
  );
}
