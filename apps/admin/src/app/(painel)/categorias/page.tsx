import CategoryManager from "@/components/categorias/CategoryManager";
import { listCategories } from "@/lib/services/categoryAdminService";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const categories = await listCategories();
  return <CategoryManager categories={categories} />;
}
