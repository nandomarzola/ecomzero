import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { config } from "@/lib/config";

// Singleton do Prisma Client — evita esgotar conexões em dev com hot-reload
// (padrão recomendado pelo Next.js: https://pris.ly/d/help/next-js-best-practices)
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
