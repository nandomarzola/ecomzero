import { z } from "zod";

function normalizeSingleLineSecret(value: unknown) {
  if (typeof value !== "string") return value;
  return value.trim().split(/\s+/)[0] ?? "";
}

function emptyStringToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL não configurada"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET precisa ter pelo menos 32 caracteres"),
  AUTH_GOOGLE_ID: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional(),
  ),
  AUTH_GOOGLE_SECRET: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional(),
  ),
  AUTH_FACEBOOK_ID: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional(),
  ),
  AUTH_FACEBOOK_SECRET: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional(),
  ),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_STOREFRONT_URL: z.preprocess(
    emptyStringToUndefined,
    z.string().url().optional(),
  ),
  RESEND_API_KEY: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional(),
  ),
  PASSWORD_RESET_EMAIL_FROM: z.preprocess(
    emptyStringToUndefined,
    z.string().min(3).optional(),
  ),
  TRANSACTIONAL_EMAIL_FROM_CONTATO: z.preprocess(
    emptyStringToUndefined,
    z.string().min(3).optional(),
  ),
  TRANSACTIONAL_EMAIL_FROM_SEGURANCA: z.preprocess(
    emptyStringToUndefined,
    z.string().min(3).optional(),
  ),
  META_CAPI_ACCESS_TOKEN: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional(),
  ),
  // Opcional: sem ela, o endpoint /api/admin/sync-catalog recusa todo request
  // em vez de derrubar o app inteiro (integração opcional, não é o core do site).
  STOREFRONT_SYNC_API_KEY: z.preprocess(
    normalizeSingleLineSecret,
    z
      .string()
      .min(32, "STOREFRONT_SYNC_API_KEY precisa ter pelo menos 32 caracteres")
      .optional(),
  ),
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
  MELHOR_ENVIO_AUTO_PURCHASE_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  MERCADOPAGO_ACCESS_TOKEN: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().min(1).optional(),
  ),
  NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().min(1).optional(),
  ),
  MERCADOPAGO_WEBHOOK_SECRET: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().min(1).optional(),
  ),
  MERCADOPAGO_ENVIRONMENT: z.enum(["test", "production"]).optional(),
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
  oauth: {
    google:
      parsed.data.AUTH_GOOGLE_ID && parsed.data.AUTH_GOOGLE_SECRET
        ? {
            clientId: parsed.data.AUTH_GOOGLE_ID,
            clientSecret: parsed.data.AUTH_GOOGLE_SECRET,
          }
        : null,
    facebook:
      parsed.data.AUTH_FACEBOOK_ID && parsed.data.AUTH_FACEBOOK_SECRET
        ? {
            clientId: parsed.data.AUTH_FACEBOOK_ID,
            clientSecret: parsed.data.AUTH_FACEBOOK_SECRET,
          }
        : null,
  },
  nodeEnv: parsed.data.NODE_ENV,
  storefrontUrl:
    parsed.data.NEXT_PUBLIC_STOREFRONT_URL ??
    (parsed.data.NODE_ENV === "production"
      ? "https://www.ecomzero.com.br"
      : "http://localhost:3000"),
  email: {
    resendApiKey: parsed.data.RESEND_API_KEY,
    contactFrom:
      parsed.data.TRANSACTIONAL_EMAIL_FROM_CONTATO ??
      parsed.data.PASSWORD_RESET_EMAIL_FROM,
    securityFrom:
      parsed.data.TRANSACTIONAL_EMAIL_FROM_SEGURANCA ??
      parsed.data.PASSWORD_RESET_EMAIL_FROM,
  },
  meta: {
    capiAccessToken: parsed.data.META_CAPI_ACCESS_TOKEN,
  },
  storefrontSyncApiKey: parsed.data.STOREFRONT_SYNC_API_KEY,
  blobReadWriteToken: parsed.data.BLOB_READ_WRITE_TOKEN,
  melhorEnvio: {
    token: parsed.data.MELHOR_ENVIO_TOKEN,
    baseUrl: parsed.data.MELHOR_ENVIO_BASE_URL,
    cepOrigem: parsed.data.MELHOR_ENVIO_CEP_ORIGEM,
    clientId: parsed.data.MELHOR_ENVIO_CLIENT_ID,
    clientSecret: parsed.data.MELHOR_ENVIO_CLIENT_SECRET,
    autoPurchaseEnabled: parsed.data.MELHOR_ENVIO_AUTO_PURCHASE_ENABLED,
  },
  mercadoPago: {
    accessToken: parsed.data.MERCADOPAGO_ACCESS_TOKEN,
    publicKey: parsed.data.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
    webhookSecret: parsed.data.MERCADOPAGO_WEBHOOK_SECRET,
    environment:
      parsed.data.MERCADOPAGO_ENVIRONMENT ??
      (parsed.data.NODE_ENV === "production" ? "production" : "test"),
  },
} as const;

export const isMercadoPagoConfigurado = Boolean(
  parsed.data.MERCADOPAGO_ACCESS_TOKEN,
);

export const isMercadoPagoBrickConfigurado = Boolean(
  parsed.data.MERCADOPAGO_ACCESS_TOKEN &&
    parsed.data.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
);

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
