import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { config } from "@/lib/config";

// Singleton do Prisma Client — evita esgotar conexões em dev com hot-reload
// (padrão recomendado pelo Next.js: https://pris.ly/d/help/next-js-best-practices)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: config.databaseUrl });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (config.nodeEnv !== "production") {
  globalForPrisma.prisma = prisma;
}
