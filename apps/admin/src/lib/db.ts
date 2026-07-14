import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { config } from "@/lib/config";

// Singleton do Prisma Client (mesmo padrão da loja). Conecta ao MESMO banco
// Postgres do storefront via driver adapter. Este projeto NUNCA migra — só lê
// e escreve dados de catálogo (Product/ProductVariant) e AdminUser.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: config.databaseUrl });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (config.nodeEnv !== "production") {
  globalForPrisma.prisma = prisma;
}
