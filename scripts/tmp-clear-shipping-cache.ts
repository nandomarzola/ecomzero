// Script temporário — limpa todo o cache de cotação de frete (recalculável).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const { count } = await prisma.shippingQuoteCache.deleteMany({});
  console.log(`Registros removidos de ShippingQuoteCache: ${count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
