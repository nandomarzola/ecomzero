// Migração única dos dados estáticos de src/data/produtos.json para o banco.
// Produtos já existentes (por slug) são preservados — rodar de novo é seguro.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import produtosData from "../src/data/produtos.json";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type SeedVariant = {
  id: string;
  label: string;
  precoDe: number;
  precoPor: number;
};

type SeedProduct = {
  slug: string;
  categoria: string;
  nome: string;
  subtitulo: string;
  descricao: string;
  imagem: string;
  imagens: string[];
  caracteristicas: string[];
  linkShopee: string;
  variantes: SeedVariant[];
};

async function main() {
  const produtos = produtosData as SeedProduct[];
  let created = 0;
  let skipped = 0;

  for (const produto of produtos) {
    const existing = await prisma.product.findUnique({
      where: { slug: produto.slug },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.product.create({
      data: {
        slug: produto.slug,
        categoria: produto.categoria,
        nome: produto.nome,
        subtitulo: produto.subtitulo,
        descricao: produto.descricao,
        imagem: produto.imagem,
        imagens: produto.imagens,
        caracteristicas: produto.caracteristicas,
        linkShopee: produto.linkShopee,
        variantes: {
          create: produto.variantes.map((variante) => ({
            label: variante.label,
            precoDe: variante.precoDe,
            precoPor: variante.precoPor,
            skuInterno: `${produto.slug}-${variante.id}`.toUpperCase(),
            // Sem link Shopee por variante na fonte original — fica null até
            // ser preenchido manualmente (ver TODO em ProductPurchase.tsx).
            linkShopee: null,
          })),
        },
      },
    });
    created += 1;
  }

  console.log(`Seed concluído: ${created} produto(s) criado(s), ${skipped} já existiam.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
