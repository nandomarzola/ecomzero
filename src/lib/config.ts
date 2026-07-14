import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL não configurada"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET precisa ter pelo menos 32 caracteres"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Opcional: sem ela, o endpoint /api/admin/sync-catalog recusa todo request
  // em vez de derrubar o app inteiro (integração opcional, não é o core do site).
  STOREFRONT_SYNC_API_KEY: z.string().min(1).optional(),
  // Vercel Blob (fotos/vídeos de produto) — criado via `vercel blob create-store`.
  // Também opcional pelo mesmo motivo: sem ela, só o upload fica indisponível.
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  // Melhor Envio (cálculo de frete) — opcionais pelo mesmo motivo: sem elas,
  // só a rota de cotação de frete fica indisponível (503), resto do site segue normal.
  MELHOR_ENVIO_TOKEN: z.string().min(1).optional(),
  MELHOR_ENVIO_BASE_URL: z
    .string()
    .url()
    .default("https://sandbox.melhorenvio.com.br"),
  MELHOR_ENVIO_CEP_ORIGEM: z.string().min(1).optional(),
  // Credenciais da aplicação OAuth de produção do Melhor Envio. Só usadas para
  // renovar o access_token via refresh_token (melhorEnvioAuthService). Opcionais:
  // sem elas, o modo produção não consegue refrescar o token (mas o sandbox, que
  // usa MELHOR_ENVIO_TOKEN fixo, segue funcionando).
  MELHOR_ENVIO_CLIENT_ID: z.string().min(1).optional(),
  MELHOR_ENVIO_CLIENT_SECRET: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
}

export const config = {
  databaseUrl: parsed.data.DATABASE_URL,
  authSecret: parsed.data.AUTH_SECRET,
  nodeEnv: parsed.data.NODE_ENV,
  storefrontSyncApiKey: parsed.data.STOREFRONT_SYNC_API_KEY,
  blobReadWriteToken: parsed.data.BLOB_READ_WRITE_TOKEN,
  melhorEnvio: {
    token: parsed.data.MELHOR_ENVIO_TOKEN,
    baseUrl: parsed.data.MELHOR_ENVIO_BASE_URL,
    cepOrigem: parsed.data.MELHOR_ENVIO_CEP_ORIGEM,
    clientId: parsed.data.MELHOR_ENVIO_CLIENT_ID,
    clientSecret: parsed.data.MELHOR_ENVIO_CLIENT_SECRET,
  },
} as const;

// true quando o frete aponta para a API de produção do Melhor Envio (não sandbox).
// Nesse modo o token vem do banco (OAuth com refresh), não da env var fixa.
export const isMelhorEnvioProducao =
  !parsed.data.MELHOR_ENVIO_BASE_URL.includes("sandbox");

// Pré-check barato para os route handlers de frete (503 antes de tocar o service).
// Produção precisa do CEP de origem + credenciais OAuth (para renovar o token);
// sandbox precisa do CEP + token fixo. Não verifica o registro no banco — isso
// fica com getValidAccessToken() no service.
export const isMelhorEnvioConfigurado = isMelhorEnvioProducao
  ? Boolean(
      parsed.data.MELHOR_ENVIO_CEP_ORIGEM &&
        parsed.data.MELHOR_ENVIO_CLIENT_ID &&
        parsed.data.MELHOR_ENVIO_CLIENT_SECRET,
    )
  : Boolean(parsed.data.MELHOR_ENVIO_TOKEN && parsed.data.MELHOR_ENVIO_CEP_ORIGEM);
