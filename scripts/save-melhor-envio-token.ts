// Script de uso único — grava no banco os tokens OAuth de produção do Melhor
// Envio obtidos na troca do authorization_code. Lê os valores TEMP do ambiente
// (MELHOR_ENVIO_ACCESS_TOKEN_TEMP / MELHOR_ENVIO_REFRESH_TOKEN_TEMP, que ficam
// só no .env.local, nunca commitados) e faz upsert no singleton
// MelhorEnvioCredential. Rodar assim (carrega .env pelo DATABASE_URL + .env.local
// pelos tokens TEMP):
//
//   npx tsx --env-file=.env --env-file=.env.local scripts/save-melhor-envio-token.ts
//
// Depois de confirmar o registro no banco, as duas linhas TEMP podem sair do
// .env.local — o token passa a viver só no banco.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// 30 dias — o expires_in que o Melhor Envio devolveu na troca do code.
const EXPIRES_IN_SECONDS = 2_592_000;

function mask(token: string): string {
  return `${token.slice(0, 8)}…${token.slice(-6)} (len ${token.length})`;
}

async function main() {
  const accessToken = process.env.MELHOR_ENVIO_ACCESS_TOKEN_TEMP;
  const refreshToken = process.env.MELHOR_ENVIO_REFRESH_TOKEN_TEMP;

  if (!accessToken || !refreshToken) {
    throw new Error(
      "MELHOR_ENVIO_ACCESS_TOKEN_TEMP / MELHOR_ENVIO_REFRESH_TOKEN_TEMP ausentes no ambiente. " +
        "Rode com: npx tsx --env-file=.env --env-file=.env.local scripts/save-melhor-envio-token.ts",
    );
  }

  const expiraEm = new Date(Date.now() + EXPIRES_IN_SECONDS * 1000);

  const record = await prisma.melhorEnvioCredential.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", accessToken, refreshToken, expiraEm },
    update: { accessToken, refreshToken, expiraEm },
  });

  console.log("MelhorEnvioCredential gravado:");
  console.log(`  id:           ${record.id}`);
  console.log(`  accessToken:  ${mask(record.accessToken)}`);
  console.log(`  refreshToken: ${mask(record.refreshToken)}`);
  console.log(`  expiraEm:     ${record.expiraEm.toISOString()}`);
  console.log(`  atualizadoEm: ${record.atualizadoEm.toISOString()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
