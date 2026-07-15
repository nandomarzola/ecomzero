import { prisma } from "@/lib/db";
import { productSlugSchema } from "@/lib/validation/product";
import type { SyncProductInput } from "@/lib/validation/sync";
import type { Product, ProductVariant } from "@/types/product";
import type {
  Product as ProductRecord,
  ProductVariant as ProductVariantRecord,
} from "@/generated/prisma/client";

// Única camada que toca o Prisma para produtos — componentes e API routes
// nunca importam @/lib/db ou @/generated/prisma diretamente.

function toVariant(record: ProductVariantRecord): ProductVariant {
  return {
    id: record.id,
    label: record.label,
    precoDe: Number(record.precoDe),
    precoPor: Number(record.precoPor),
    skuInterno: record.skuInterno,
    linkShopee: record.linkShopee,
  };
}

const cleanCatalogText = (value: string) =>
  value.replace(/\s*:contentReference\[[^\]]+\]\{[^}]+\}/g, "").trim();

function toProduct(
  record: ProductRecord & { variantes: ProductVariantRecord[] },
): Product {
  const images = [record.imagem, ...record.imagens.filter((image) => image !== record.imagem)];
  return {
    id: record.id,
    slug: record.slug,
    categoria: record.categoria,
    categoryId: record.categoryId,
    tipo: record.tipo,
    nome: record.nome,
    subtitulo: record.subtitulo,
    descricao: cleanCatalogText(record.descricao),
    imagem: record.imagem,
    imagens: images,
    caracteristicas: record.caracteristicas,
    linkShopee: record.linkShopee,
    linkMercadoLivre: record.linkMercadoLivre,
    linkTiktokShop: record.linkTiktokShop,
    linkShein: record.linkShein,
    ativo: record.ativo,
    variantes: record.variantes.map(toVariant),
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const records = await prisma.product.findMany({
    where: { ativo: true },
    include: { variantes: { orderBy: { id: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return records.map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const parsedSlug = productSlugSchema.safeParse(slug);
  if (!parsedSlug.success) return null;

  const record = await prisma.product.findUnique({
    where: { slug: parsedSlug.data },
    include: { variantes: { orderBy: { id: "asc" } } },
  });

  if (!record || !record.ativo) return null;

  return toProduct(record);
}

export function findCategoryLabel(categoria: string): string | null {
  return categoria.split(" / ").filter(Boolean).at(-1) ?? null;
}

export function getRelatedProducts(
  product: Product,
  allProducts: Product[],
  limit = 5,
): Product[] {
  const prioritized = allProducts.filter((candidate) => {
    if (candidate.slug === product.slug) return false;
    return product.categoryId
      ? candidate.categoryId === product.categoryId
      : candidate.categoria === product.categoria;
  });

  const prioritizedSlugs = new Set(prioritized.map((candidate) => candidate.slug));
  const fallback = allProducts.filter(
    (candidate) =>
      candidate.slug !== product.slug && !prioritizedSlugs.has(candidate.slug),
  );

  return [...prioritized, ...fallback].slice(0, limit);
}

// Produtos fora de uma lista de exclusão (ex.: os que já estão no carrinho) —
// usado pela vitrine "também pode te interessar" do carrinho.
export function getOtherProducts(
  allProducts: Product[],
  excludeSlugs: string[],
  limit = 8,
): Product[] {
  const excluded = new Set(excludeSlugs);
  return allProducts.filter((product) => !excluded.has(product.slug)).slice(0, limit);
}

export type SyncResult = {
  created: number;
  updated: number;
  errors: { slug: string; error: string }[];
};

// Cria/atualiza produtos vindos do admin do Hub (POST /api/admin/sync-catalog).
// Casa por slug. Variantes casam por skuInterno (se os dois lados tiverem) ou
// por label — o Hub não garante skuInterno estável em todo produto.
export async function syncProductsFromHub(produtos: SyncProductInput[]): Promise<SyncResult> {
  let created = 0;
  let updated = 0;
  const errors: { slug: string; error: string }[] = [];

  for (const produto of produtos) {
    try {
      const existing = await prisma.product.findUnique({
        where: { slug: produto.slug },
        include: { variantes: true },
      });

      const productData = {
        categoria: produto.categoria,
        nome: produto.nome,
        subtitulo: produto.subtitulo,
        descricao: produto.descricao,
        imagem: produto.imagem,
        imagens: produto.imagens,
        caracteristicas: produto.caracteristicas,
        linkShopee: produto.linkShopee,
        ativo: produto.ativo,
      };

      if (existing) {
        await prisma.product.update({ where: { id: existing.id }, data: productData });

        for (const variante of produto.variantes) {
          const existingVariant =
            (variante.skuInterno &&
              existing.variantes.find((v) => v.skuInterno === variante.skuInterno)) ||
            existing.variantes.find((v) => v.label === variante.label);

          const variantData = {
            label: variante.label,
            precoDe: variante.precoDe,
            precoPor: variante.precoPor,
            linkShopee: variante.linkShopee ?? null,
            skuInterno: variante.skuInterno ?? null,
          };

          if (existingVariant) {
            await prisma.productVariant.update({
              where: { id: existingVariant.id },
              data: variantData,
            });
          } else {
            await prisma.productVariant.create({
              data: { ...variantData, productId: existing.id },
            });
          }
        }

        updated += 1;
      } else {
        await prisma.product.create({
          data: {
            slug: produto.slug,
            ...productData,
            variantes: {
              create: produto.variantes.map((variante) => ({
                label: variante.label,
                precoDe: variante.precoDe,
                precoPor: variante.precoPor,
                linkShopee: variante.linkShopee ?? null,
                skuInterno: variante.skuInterno ?? null,
              })),
            },
          },
        });

        created += 1;
      }
    } catch (error) {
      errors.push({
        slug: produto.slug,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  return { created, updated, errors };
}
