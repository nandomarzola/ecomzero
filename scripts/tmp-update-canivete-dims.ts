// Script temporário — atualiza dimensões reais das variantes do canivete Xingu.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SLUG = "canivete-tatico-xingu-dobravel-aco-inox-camuflado";

const dims: Record<string, { pesoKg: number; comprimentoCm: number; larguraCm: number; alturaCm: number }> = {
  "1 unidade": { pesoKg: 0.061, comprimentoCm: 22, larguraCm: 19, alturaCm: 2 },
  "2 unidades": { pesoKg: 0.122, comprimentoCm: 22, larguraCm: 19, alturaCm: 2 },
  "3 unidades": { pesoKg: 0.182, comprimentoCm: 22, larguraCm: 19, alturaCm: 2 },
};

async function main() {
  const product = await prisma.product.findUnique({
    where: { slug: SLUG },
    include: { variantes: true },
  });
  if (!product) throw new Error(`Produto não encontrado: ${SLUG}`);

  console.log(`Produto: ${product.nome} (${product.id})\n`);

  for (const variant of product.variantes) {
    const target = dims[variant.label];
    console.log(
      `Variante "${variant.label}" (${variant.id})\n` +
        `  antes:  ${variant.pesoKg}kg  ${variant.comprimentoCm}x${variant.larguraCm}x${variant.alturaCm}cm (CxLxA)`,
    );
    if (!target) {
      console.log("  → sem dimensões definidas para este label, pulando\n");
      continue;
    }
    await prisma.productVariant.update({ where: { id: variant.id }, data: target });
    console.log(
      `  depois: ${target.pesoKg}kg  ${target.comprimentoCm}x${target.larguraCm}x${target.alturaCm}cm (CxLxA)\n`,
    );

    const cleared = await prisma.shippingQuoteCache.deleteMany({
      where: { cacheKey: { startsWith: variant.id } },
    });
    if (cleared.count > 0) console.log(`  (${cleared.count} entrada(s) de cache de frete removida(s))\n`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
