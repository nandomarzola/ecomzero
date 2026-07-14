import { defineConfig } from "prisma/config";

// Sem bloco `migrations` de propósito: este projeto NUNCA migra (schema é da
// raiz). Só usamos a CLI do Prisma para `generate`. A URL vem do ambiente
// (apps/admin/.env.local) quando algum comando precisar conectar.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
