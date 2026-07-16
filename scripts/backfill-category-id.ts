// Backfill de Product.categoryId a partir do path legado Product.categoria.
//
// Muitos produtos (legado / vindos do Hub) têm categoryId NULO e só o campo
// `categoria` (path de nomes, ex.: "Pesca / Canivetes"). Este script casa esse
// path com Category.path e preenche o FK categoryId. Casa APENAS por igualdade
// EXATA de path — casos com diferença de caixa/espaço ou sem correspondência
// são só REPORTADOS (não gravados), para decisão manual.
//
// Dry-run por padrão (só relatório, não grava nada). Com --apply, grava os
// casos exatos. Nunca cria categoria (decisão do dono: sem auto-create).
//
// Rodar:
//   npx tsx --env-file=.env scripts/backfill-category-id.ts             # dry-run (dev)
//   npx tsx --env-file=.env scripts/backfill-category-id.ts --apply     # grava (dev)
// Contra produção: exporte DATABASE_URL com a URL direta do dashboard, ex.:
//   DATABASE_URL='postgres://…@db.prisma.io:5432/postgres?sslmode=require' \
//     npx tsx scripts/backfill-category-id.ts            # dry-run em prod
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");

type Cat = { id: string; nome: string; parentId: string | null };

// Path de nomes raiz→folha, igual ao que o admin grava em Product.categoria.
function buildPath(id: string, byId: Map<string, Cat>): string {
  const names: string[] = [];
  let current: string | null = id;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const cat = byId.get(current);
    if (!cat) break;
    names.unshift(cat.nome);
    current = cat.parentId;
  }
  return names.join(" / ");
}

// Normalização tolerante para detectar "quase-matches" (caixa/espaço).
function normalize(path: string): string {
  return path
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" / ")
    .toLowerCase();
}

async function main() {
  const cats: Cat[] = await prisma.category.findMany({
    select: { id: true, nome: true, parentId: true },
  });
  const byId = new Map(cats.map((c) => [c.id, c]));

  const byExact = new Map<string, string[]>();
  const byNorm = new Map<string, string[]>();
  for (const c of cats) {
    const path = buildPath(c.id, byId);
    byExact.set(path, [...(byExact.get(path) ?? []), c.id]);
    const norm = normalize(path);
    byNorm.set(norm, [...(byNorm.get(norm) ?? []), c.id]);
  }

  const products = await prisma.product.findMany({
    where: { categoryId: null },
    select: { id: true, slug: true, nome: true, categoria: true },
    orderBy: { slug: "asc" },
  });

  const matched: { slug: string; categoria: string; categoryId: string }[] = [];
  const nearMiss: { slug: string; categoria: string; categoryId: string }[] = [];
  const ambiguous: { slug: string; categoria: string; ids: string[] }[] = [];
  const unmatched: { slug: string; categoria: string }[] = [];

  for (const p of products) {
    const raw = (p.categoria ?? "").trim();
    const exact = byExact.get(raw) ?? [];
    if (exact.length === 1) {
      matched.push({ slug: p.slug, categoria: raw, categoryId: exact[0] });
      continue;
    }
    if (exact.length > 1) {
      ambiguous.push({ slug: p.slug, categoria: raw, ids: exact });
      continue;
    }
    const norm = byNorm.get(normalize(raw)) ?? [];
    if (norm.length === 1) {
      nearMiss.push({ slug: p.slug, categoria: raw, categoryId: norm[0] });
      continue;
    }
    if (norm.length > 1) {
      ambiguous.push({ slug: p.slug, categoria: raw, ids: norm });
      continue;
    }
    unmatched.push({ slug: p.slug, categoria: raw });
  }

  const line = "─".repeat(64);
  console.log(line);
  console.log(`BACKFILL categoryId — ${APPLY ? "APPLY (grava)" : "DRY-RUN (não grava)"}`);
  console.log(line);
  console.log(`Categorias no banco: ${cats.length}`);
  console.log(`Produtos com categoryId nulo: ${products.length}`);
  console.log("");
  console.log(`✓ Casáveis (path exato):        ${matched.length}`);
  console.log(`~ Quase-match (caixa/espaço):   ${nearMiss.length}  (NÃO gravados)`);
  console.log(`? Ambíguos (path repetido):     ${ambiguous.length}  (NÃO gravados)`);
  console.log(`✗ Sem correspondência:          ${unmatched.length}  (NÃO gravados)`);
  console.log(line);

  const dump = (
    title: string,
    rows: { slug: string; categoria: string; extra?: string }[],
  ) => {
    if (rows.length === 0) return;
    console.log(`\n${title}:`);
    for (const r of rows.slice(0, 100)) {
      console.log(`  ${r.slug.padEnd(28)} categoria="${r.categoria}"${r.extra ?? ""}`);
    }
    if (rows.length > 100) console.log(`  … +${rows.length - 100} outros`);
  };

  dump("✓ CASÁVEIS", matched.map((m) => ({ slug: m.slug, categoria: m.categoria, extra: ` → ${m.categoryId}` })));
  dump("~ QUASE-MATCH (revisar)", nearMiss.map((m) => ({ slug: m.slug, categoria: m.categoria, extra: ` ≈ ${m.categoryId}` })));
  dump("? AMBÍGUOS (revisar)", ambiguous.map((m) => ({ slug: m.slug, categoria: m.categoria, extra: ` → [${m.ids.join(", ")}]` })));
  dump("✗ SEM CORRESPONDÊNCIA", unmatched);

  console.log(`\n${line}`);
  if (APPLY) {
    let applied = 0;
    for (const m of matched) {
      await prisma.product.updateMany({
        where: { slug: m.slug, categoryId: null },
        data: { categoryId: m.categoryId },
      });
      applied += 1;
    }
    console.log(`APPLY concluído: ${applied} produto(s) vinculado(s) (só casos exatos).`);
  } else {
    console.log("DRY-RUN: nada gravado. Rode de novo com --apply para gravar os casáveis.");
  }
  console.log(line);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
