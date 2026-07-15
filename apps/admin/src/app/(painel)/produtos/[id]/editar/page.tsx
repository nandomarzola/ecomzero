import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/services/productAdminService";
import ProductForm, { type ProductFormInitial } from "@/components/produtos/ProductForm";
import { listCategories } from "@/lib/services/categoryAdminService";

export const metadata: Metadata = { title: "Editar produto" };
export const dynamic = "force-dynamic";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();
  const categories = await listCategories();

  const initial: ProductFormInitial = {
    nome: product.nome,
    tipo: product.tipo,
    categoryId: product.categoryId ?? "",
    subtitulo: product.subtitulo,
    descricao: product.descricao,
    ativo: product.ativo,
    imagem: product.imagem,
    imagens: product.imagens,
    linkShopee: product.linkShopee ?? "",
    linkMercadoLivre: product.linkMercadoLivre ?? "",
    linkTiktokShop: product.linkTiktokShop ?? "",
    linkShein: product.linkShein ?? "",
    variantes: product.variantes.map((v) => ({
      id: v.id,
      label: v.label,
      precoDe: String(v.precoDe),
      precoPor: String(v.precoPor),
      skuInterno: v.skuInterno ?? "",
      pesoKg: String(v.pesoKg),
      comprimentoCm: String(v.comprimentoCm),
      larguraCm: String(v.larguraCm),
      alturaCm: String(v.alturaCm),
    })),
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold text-white">Editar produto</h1>
      <ProductForm mode="edit" productId={id} initial={initial} categories={categories} />
    </div>
  );
}
