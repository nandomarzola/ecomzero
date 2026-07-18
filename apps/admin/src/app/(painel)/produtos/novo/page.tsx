import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductForm, {
  type ProductFormInitial,
} from "@/components/produtos/ProductForm";
import { listCategories } from "@/lib/services/categoryAdminService";
import { getProductById } from "@/lib/services/productAdminService";

export const metadata: Metadata = { title: "Novo produto" };

export const dynamic = "force-dynamic";

type NovoProdutoPageProps = {
  searchParams: Promise<{ copiar?: string | string[] }>;
};

export default async function NovoProdutoPage({ searchParams }: NovoProdutoPageProps) {
  const params = await searchParams;
  const copyId = typeof params.copiar === "string" ? params.copiar : null;
  const [categories, source] = await Promise.all([
    listCategories(),
    copyId ? getProductById(copyId) : Promise.resolve(null),
  ]);

  if (copyId && !source) notFound();

  const initial: ProductFormInitial | undefined = source
    ? {
        nome: source.nome,
        tipo: source.tipo,
        categoryId: source.categoryId ?? "",
        subtitulo: source.subtitulo,
        descricao: "",
        ativo: source.ativo,
        isNovidade: source.isNovidade,
        isPromocao: source.isPromocao,
        imagem: "",
        imagens: [],
        linkShopee: source.linkShopee ?? "",
        linkMercadoLivre: source.linkMercadoLivre ?? "",
        linkTiktokShop: source.linkTiktokShop ?? "",
        linkShein: source.linkShein ?? "",
        variantes: source.variantes.map((variant) => ({
          label: variant.label,
          precoDe: String(variant.precoDe),
          precoPor: String(variant.precoPor),
          skuInterno: variant.skuInterno ?? "",
          pesoKg: String(variant.pesoKg),
          comprimentoCm: String(variant.comprimentoCm),
          larguraCm: String(variant.larguraCm),
          alturaCm: String(variant.alturaCm),
        })),
      }
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold text-white">
        {source ? "Copiar produto" : "Novo produto"}
      </h1>
      <ProductForm
        key={source?.id ?? "new-product"}
        mode="create"
        categories={categories}
        initial={initial}
        copiedFrom={source?.nome}
      />
    </div>
  );
}
