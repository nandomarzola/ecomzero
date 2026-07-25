import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { config } from "@/lib/config";

// Singleton do Prisma Client (mesmo padrão da loja). Conecta ao MESMO banco
// Postgres do storefront via driver adapter. Este projeto NUNCA migra — só lê
// e escreve dados de catálogo (Product/ProductVariant) e AdminUser.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: config.databaseUrl,
    max: config.nodeEnv === "production" ? 1 : 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
