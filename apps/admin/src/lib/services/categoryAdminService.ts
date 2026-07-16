import { prisma } from "@/lib/db";
import type { CategoryInput, CategoryReorderInput } from "@/lib/validation/category";

export type CategoryListItem = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  imagemUrl: string | null;
  destaque: boolean;
  metaTitulo: string | null;
  metaDescricao: string | null;
  parentId: string | null;
  ativo: boolean;
  ordem: number;
  depth: number;
  path: string;
  childrenCount: number;
  productsCount: number;
  createdAt: string;
  updatedAt: string;
};

export class CategoryAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CategoryAdminError";
  }
}

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function uniqueSlug(nome: string, ignoreId?: string) {
  const base = slugify(nome) || "categoria";
  let slug = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export async function listCategories(): Promise<CategoryListItem[]> {
  const rows = await prisma.category.findMany({
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    include: { _count: { select: { children: true, produtos: true } } },
  });

  const childrenByParent = new Map<string | null, typeof rows>();
  for (const row of rows) {
    const siblings = childrenByParent.get(row.parentId) ?? [];
    siblings.push(row);
    childrenByParent.set(row.parentId, siblings);
  }

  const result: CategoryListItem[] = [];
  const visited = new Set<string>();

  const visit = (parentId: string | null, depth: number, parentPath: string) => {
    for (const row of childrenByParent.get(parentId) ?? []) {
      if (visited.has(row.id)) continue;
      visited.add(row.id);
      const path = parentPath ? `${parentPath} / ${row.nome}` : row.nome;
      result.push({
        id: row.id,
        nome: row.nome,
        slug: row.slug,
        descricao: row.descricao,
        imagemUrl: row.imagemUrl,
        destaque: row.destaque,
        metaTitulo: row.metaTitulo,
        metaDescricao: row.metaDescricao,
        parentId: row.parentId,
        ativo: row.ativo,
        ordem: row.ordem,
        depth,
        path,
        childrenCount: row._count.children,
        productsCount: row._count.produtos,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      });
      visit(row.id, depth + 1, path);
    }
  };

  visit(null, 0, "");
  for (const row of rows) {
    if (!visited.has(row.id)) visit(row.parentId, 0, "");
  }

  return result;
}

async function nextCategoryOrder(parentId?: string) {
  const result = await prisma.category.aggregate({
    where: { parentId: parentId ?? null },
    _max: { ordem: true },
  });
  return (result._max.ordem ?? -1) + 1;
}

async function assertValidParent(categoryId: string | undefined, parentId?: string) {
  if (!parentId) return;
  if (categoryId === parentId) throw new CategoryAdminError("Uma categoria não pode ser filha dela mesma.");

  const selectedParent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { parentId: true },
  });
  if (!selectedParent) throw new CategoryAdminError("Categoria pai não encontrada.");
  if (selectedParent.parentId) {
    throw new CategoryAdminError("A hierarquia aceita somente categoria raiz e subcategoria.");
  }

  let currentId: string | null = parentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === categoryId) {
      throw new CategoryAdminError("Essa alteração criaria um ciclo na árvore de categorias.");
    }
    if (visited.has(currentId)) throw new CategoryAdminError("A hierarquia atual contém um ciclo inválido.");
    visited.add(currentId);
    const current: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!current) throw new CategoryAdminError("Categoria pai não encontrada.");
    currentId = current.parentId;
  }
}

export async function duplicateCategory(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new CategoryAdminError("Categoria não encontrada.");
  if (category.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: category.parentId },
      select: { parentId: true },
    });
    if (parent?.parentId) {
      throw new CategoryAdminError("Categorias abaixo do segundo nível não podem ser duplicadas.");
    }
  }

  const nome = `${category.nome} (cópia)`;
  return prisma.category.create({
    data: {
      nome,
      slug: await uniqueSlug(nome),
      descricao: category.descricao,
      imagemUrl: category.imagemUrl,
      destaque: false,
      metaTitulo: category.metaTitulo,
      metaDescricao: category.metaDescricao,
      parentId: category.parentId,
      ordem: await nextCategoryOrder(category.parentId ?? undefined),
      ativo: false,
    },
    select: { id: true },
  });
}

export async function createCategory(input: CategoryInput) {
  await assertValidParent(undefined, input.parentId);
  return prisma.category.create({
    data: {
      nome: input.nome,
      slug: await uniqueSlug(input.nome),
      descricao: input.descricao ?? null,
      imagemUrl: input.imagemUrl ?? null,
      destaque: input.destaque,
      metaTitulo: input.metaTitulo ?? null,
      metaDescricao: input.metaDescricao ?? null,
      parentId: input.parentId ?? null,
      ordem: await nextCategoryOrder(input.parentId),
      ativo: input.ativo,
    },
    select: { id: true },
  });
}

// Recomputa o path denormalizado Product.categoria de todos os produtos
// vinculados (por categoryId) à categoria e às suas descendentes. Chamado após
// rename/move — mantém o path em sincronia com a nova estrutura e evita que
// produtos fiquem órfãos silenciosos nas listagens da loja que casam por texto.
// (Produtos sem categoryId — legado/Hub — não são alcançáveis aqui; por isso o
// backfill de categoryId é o passo complementar.)
async function recomputeCategoriaPaths(rootId: string): Promise<void> {
  const cats = await prisma.category.findMany({ select: { id: true, nome: true, parentId: true } });
  const byId = new Map(cats.map((category) => [category.id, category]));

  const pathOf = (id: string): string => {
    const names: string[] = [];
    let current: string | null = id;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
      seen.add(current);
      const category = byId.get(current);
      if (!category) break;
      names.unshift(category.nome);
      current = category.parentId;
    }
    return names.join(" / ");
  };

  const childrenByParent = new Map<string, string[]>();
  for (const category of cats) {
    if (category.parentId) {
      childrenByParent.set(category.parentId, [
        ...(childrenByParent.get(category.parentId) ?? []),
        category.id,
      ]);
    }
  }

  const subtree: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    subtree.push(current);
    stack.push(...(childrenByParent.get(current) ?? []));
  }

  await prisma.$transaction(
    subtree.map((categoryId) =>
      prisma.product.updateMany({ where: { categoryId }, data: { categoria: pathOf(categoryId) } }),
    ),
  );
}

export async function updateCategory(id: string, input: CategoryInput) {
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true, parentId: true, ordem: true, _count: { select: { children: true } } },
  });
  if (!existing) throw new CategoryAdminError("Categoria não encontrada.");
  await assertValidParent(id, input.parentId);

  const parentId = input.parentId ?? null;
  if (parentId && existing._count.children > 0) {
    throw new CategoryAdminError("Mova ou remova as subcategorias antes de transformar esta categoria em subcategoria.");
  }
  const ordem = existing.parentId === parentId
    ? existing.ordem
    : await nextCategoryOrder(input.parentId);

  const updated = await prisma.category.update({
    where: { id },
    data: {
      nome: input.nome,
      slug: await uniqueSlug(input.nome, id),
      descricao: input.descricao ?? null,
      imagemUrl: input.imagemUrl ?? null,
      destaque: input.destaque,
      metaTitulo: input.metaTitulo ?? null,
      metaDescricao: input.metaDescricao ?? null,
      parentId,
      ordem,
      ativo: input.ativo,
    },
    select: { id: true },
  });

  // Rename/move altera o path desta categoria e das descendentes —
  // ressincroniza o Product.categoria denormalizado dos produtos vinculados.
  await recomputeCategoriaPaths(updated.id);

  return updated;
}

export async function reorderCategories(input: CategoryReorderInput): Promise<void> {
  const parentId = input.parentId ?? null;
  const siblings = await prisma.category.findMany({
    where: { parentId },
    select: { id: true },
  });

  const currentIds = new Set(siblings.map((category) => category.id));
  const orderedIds = new Set(input.orderedIds);
  const isCompleteSiblingSet = input.orderedIds.length === orderedIds.size
    && currentIds.size === orderedIds.size
    && input.orderedIds.every((id) => currentIds.has(id));

  if (!isCompleteSiblingSet) {
    throw new CategoryAdminError("A lista de categorias mudou. Recarregue a página e tente novamente.");
  }

  await prisma.$transaction(
    input.orderedIds.map((id, ordem) => prisma.category.update({
      where: { id },
      data: { ordem },
      select: { id: true },
    })),
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { children: true, produtos: true } } },
  });
  if (!category) throw new CategoryAdminError("Categoria não encontrada.");
  if (category._count.children > 0) {
    throw new CategoryAdminError("Remova ou mova as subcategorias antes de excluir esta categoria.");
  }
  if (category._count.produtos > 0) {
    throw new CategoryAdminError("Esta categoria possui produtos vinculados e não pode ser excluída.");
  }
  await prisma.category.delete({ where: { id } });
}
