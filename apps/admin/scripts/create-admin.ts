// Cria/atualiza o ÚNICO usuário do painel admin (single-user).
// Uso:
//   npx tsx --env-file=.env.local scripts/create-admin.ts <email> <senha> [owner|staff]
// Se o e-mail já existir, atualiza a senha (upsert). Senha guardada com bcrypt.
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [emailArg, senhaArg, roleArg] = process.argv.slice(2);
  if (!emailArg || !senhaArg) {
    throw new Error(
      "Uso: npx tsx --env-file=.env.local scripts/create-admin.ts <email> <senha> [owner|staff]",
    );
  }

  const email = emailArg.trim().toLowerCase();
  if (senhaArg.length < 10 || !/[a-z]/.test(senhaArg) || !/[A-Z]/.test(senhaArg) || !/\d/.test(senhaArg)) {
    throw new Error("A senha precisa ter ao menos 10 caracteres, maiúscula, minúscula e número.");
  }

  const role = roleArg === undefined ? undefined : roleArg.trim().toLowerCase();
  if (role !== undefined && role !== "owner" && role !== "staff") {
    throw new Error("O papel precisa ser owner ou staff.");
  }

  const senhaHash = await bcrypt.hash(senhaArg, 10);
  const admin = await prisma.adminUser.upsert({
    where: { email },
    create: { email, senhaHash, role: role ?? "owner" },
    update: {
      senhaHash,
      sessionsValidAfter: new Date(),
      ...(role ? { role } : {}),
    },
  });

  console.log(`AdminUser pronto: ${admin.email} (${admin.role}, id ${admin.id})`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
