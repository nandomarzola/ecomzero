import { prisma } from "@/lib/db";
import type { ProductInput } from "@/lib/validation/product";

// Única camada que toca o Prisma no admin (mesma arquitetura da loja). Cuida só
// de catálogo (Product/ProductVariant) — carrinho/pedido/frete são domínio
// exclusivo do storefront.

export type ProductListItem = {
  id: string;
  nome: string;
  slug: string;
  categoria: string;
  imagem: string;
  ativo: boolean;
  precoPor: number | null;
  variantesCount: number;
  tipo: "simples" | "variacoes";
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Garante slug único no banco (append -2, -3… se colidir). `ignoreId` permite
// que o próprio produto mantenha seu slug ao editar.
async function uniqueSlug(nome: string, ignoreId?: string): Promise<string> {
  const base = slugify(nome) || "produto";
  let slug = base;
  let n = 1;
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

function variantData(v: ProductInput["variantes"][number]) {
  return {
    label: v.label,
    precoDe: v.precoDe,
    precoPor: v.precoPor,
    skuInterno: v.skuInterno ?? null,
    linkShopee: null,
    pesoKg: v.pesoKg,
    comprimentoCm: v.comprimentoCm,
    larguraCm: v.larguraCm,
    alturaCm: v.alturaCm,
  };
}

async function resolveCategory(categoryId: string): Promise<{ id: string; path: string }> {
  const names: string[] = [];
  let currentId: string | null = categoryId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) throw new Error("A categoria selecionada possui uma hierarquia inválida.");
    visited.add(currentId);
    const category: { id: string; nome: string; parentId: string | null; ativo: boolean } | null = await prisma.category.findUnique({
      where: { id: currentId },
      select: { id: true, nome: true, parentId: true, ativo: true },
    });
    if (!category) throw new Error("Categoria não encontrada.");
    if (!category.ativo) throw new Error("Selecione uma categoria ativa.");
    names.unshift(category.nome);
    currentId = category.parentId;
  }

  return { id: categoryId, path: names.join(" / ") };
}

export async function listProducts(search?: string): Promise<ProductListItem[]> {
  const termo = search?.trim();
  const products = await prisma.product.findMany({
    where: termo
      ? {
          OR: [
            { nome: { contains: termo, mode: "insensitive" } },
            { categoria: { contains: termo, mode: "insensitive" } },
            { slug: { contains: termo, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      variantes: { orderBy: { precoPor: "asc" }, take: 1, select: { precoPor: true } },
      _count: { select: { variantes: true } },
    },
  });

  return products.map((p) => ({
    id: p.id,
    nome: p.nome,
    slug: p.slug,
    categoria: p.categoria,
    imagem: p.imagem,
    ativo: p.ativo,
    precoPor: p.variantes[0] ? Number(p.variantes[0].precoPor) : null,
    variantesCount: p._count.variantes,
    tipo: p.tipo,
  }));
}

export async function countProducts(): Promise<number> {
  return prisma.product.count();
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { variantes: { orderBy: { precoPor: "asc" } } },
  });
}

export async function createProduct(input: ProductInput): Promise<{ id: string }> {
  const slug = await uniqueSlug(input.nome);
  const category = await resolveCategory(input.categoryId);
  const product = await prisma.product.create({
    data: {
      slug,
      tipo: input.tipo,
      categoryId: category.id,
      nome: input.nome,
      categoria: category.path,
      subtitulo: input.subtitulo,
      descricao: input.descricao,
      ativo: input.ativo,
      imagem: input.imagem,
      imagens: input.imagens,
      caracteristicas: [],
      linkShopee: input.linkShopee ?? null,
      linkMercadoLivre: input.linkMercadoLivre ?? null,
      linkTiktokShop: input.linkTiktokShop ?? null,
      linkShein: input.linkShein ?? null,
      variantes: { create: input.variantes.map(variantData) },
    },
    select: { id: true },
  });
  return product;
}

export async function updateProduct(id: string, input: ProductInput): Promise<{ id: string }> {
  const slug = await uniqueSlug(input.nome, id);
  const category = await resolveCategory(input.categoryId);
  const keepIds = input.variantes.map((v) => v.id).filter((v): v is string => Boolean(v));

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        slug,
        tipo: input.tipo,
        categoryId: category.id,
        nome: input.nome,
        categoria: category.path,
        subtitulo: input.subtitulo,
        descricao: input.descricao,
        ativo: input.ativo,
        imagem: input.imagem,
        imagens: input.imagens,
        linkShopee: input.linkShopee ?? null,
        linkMercadoLivre: input.linkMercadoLivre ?? null,
        linkTiktokShop: input.linkTiktokShop ?? null,
        linkShein: input.linkShein ?? null,
      },
    });

    // Remove variantes que saíram do formulário. Se alguma tiver pedido antigo
    // (FK), o delete falha e o erro sobe pra action (não silencia).
    await tx.productVariant.deleteMany({
      where: { productId: id, id: { notIn: keepIds } },
    });

    for (const v of input.variantes) {
      if (v.id) {
        await tx.productVariant.update({ where: { id: v.id }, data: variantData(v) });
      } else {
        await tx.productVariant.create({ data: { productId: id, ...variantData(v) } });
      }
    }
  });

  return { id };
}

// Soft-delete: preferimos inativar a excluir de verdade, pra não quebrar
// pedidos antigos que referenciam o produto/variante.
export async function setProductActive(id: string, ativo: boolean): Promise<void> {
  await prisma.product.update({ where: { id }, data: { ativo } });
}
