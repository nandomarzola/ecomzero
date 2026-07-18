import { z } from "zod";

function normalizeSingleLineSecret(value: unknown) {
  if (typeof value !== "string") return value;
  return value.trim().split(/\s+/)[0] ?? "";
}

// Lê e valida as env vars uma vez. DATABASE_URL é a MESMA connection string da
// loja (ecomzero raiz) — este painel escreve direto no banco do storefront.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL não configurada"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET precisa ter pelo menos 32 caracteres"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Upload de imagens de produto. Opcional: sem ela, só o upload fica indisponível.
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  MELHOR_ENVIO_BASE_URL: z.string().url().optional(),
  MELHOR_ENVIO_CEP_ORIGEM: z.string().min(8).optional(),
  MELHOR_ENVIO_CLIENT_ID: z.string().min(1).optional(),
  MELHOR_ENVIO_CLIENT_SECRET: z.string().min(1).optional(),
  MELHOR_ENVIO_AUTO_PURCHASE_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  STOREFRONT_SYNC_API_KEY: z.preprocess(
    normalizeSingleLineSecret,
    z
      .string()
      .min(32, "STOREFRONT_SYNC_API_KEY precisa ter pelo menos 32 caracteres")
      .optional(),
  ),
  NEXT_PUBLIC_STOREFRONT_URL: z.string().url().optional(),
  NEXT_PUBLIC_ADMIN_LOGO_URL: z.string().min(1).optional(),
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
  blobReadWriteToken: parsed.data.BLOB_READ_WRITE_TOKEN,
  melhorEnvioBaseUrl: parsed.data.MELHOR_ENVIO_BASE_URL,
  melhorEnvioCepOrigem: parsed.data.MELHOR_ENVIO_CEP_ORIGEM,
  melhorEnvioClientId: parsed.data.MELHOR_ENVIO_CLIENT_ID,
  melhorEnvioClientSecret: parsed.data.MELHOR_ENVIO_CLIENT_SECRET,
  melhorEnvioAutoPurchaseEnabled:
    parsed.data.MELHOR_ENVIO_AUTO_PURCHASE_ENABLED,
  storefrontSyncApiKey: parsed.data.STOREFRONT_SYNC_API_KEY,
  storefrontUrl: parsed.data.NEXT_PUBLIC_STOREFRONT_URL,
  adminLogoUrl: parsed.data.NEXT_PUBLIC_ADMIN_LOGO_URL ?? "/admin-logo.svg",
} as const;
