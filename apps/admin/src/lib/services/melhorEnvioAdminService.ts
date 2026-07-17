import { config } from "@/lib/config";
import { prisma } from "@/lib/db";

const USER_AGENT = "EcomZero (contato@ecomzero.com.br)";
const REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000;

type ApiObject = Record<string, unknown>;

export type MelhorEnvioBalance = {
  status: "live" | "stale" | "unavailable";
  value: number | null;
  checkedAt: string | null;
  error: string | null;
};

export class MelhorEnvioAdminError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = "MelhorEnvioAdminError";
  }
}

function apiBaseUrl() {
  return config.melhorEnvioBaseUrl ?? "https://melhorenvio.com.br";
}

function responseMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const object = data as ApiObject;
  if (typeof object.message === "string") return object.message;
  if (typeof object.error_description === "string") return object.error_description;
  if (typeof object.error === "string") return object.error;
  if (object.errors && typeof object.errors === "object") {
    const first = Object.values(object.errors as ApiObject).flat()[0];
    if (typeof first === "string") return first;
  }
  return fallback;
}

function findBalance(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const object = value as ApiObject;
  for (const key of ["balance", "saldo", "available_balance", "current_balance"]) {
    const candidate = object[key];
    const parsed =
      typeof candidate === "number"
        ? candidate
        : typeof candidate === "string"
          ? Number(candidate.replace(",", "."))
          : Number.NaN;
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  for (const nested of Object.values(object)) {
    const found = findBalance(nested);
    if (found !== null) return found;
  }
  return null;
}

function errorMessage(error: unknown) {
  if (
    error instanceof MelhorEnvioAdminError &&
    (error.status === 401 || error.status === 403)
  ) {
    return "A integração não possui permissão para consultar o saldo. Reautorize a conta Melhor Envio.";
  }
  return error instanceof Error
    ? error.message
    : "Não foi possível consultar o saldo da Melhor Carteira.";
}

async function refreshToken(refreshToken: string): Promise<string> {
  if (!config.melhorEnvioClientId || !config.melhorEnvioClientSecret) {
    throw new MelhorEnvioAdminError(
      "Configure o Client ID e o Client Secret do Melhor Envio no ambiente do painel.",
      503,
    );
  }

  const response = await fetch(`${apiBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.melhorEnvioClientId,
      client_secret: config.melhorEnvioClientSecret,
    }),
    signal: AbortSignal.timeout(12_000),
  }).catch(() => null);

  if (!response) {
    throw new MelhorEnvioAdminError("Não foi possível conectar ao Melhor Envio.");
  }

  const data = (await response.json().catch(() => null)) as ApiObject | null;
  if (!response.ok) {
    throw new MelhorEnvioAdminError(
      responseMessage(data, "O Melhor Envio recusou a renovação do acesso. Reautorize a integração."),
      response.status,
    );
  }

  const accessToken = typeof data?.access_token === "string" ? data.access_token : null;
  const nextRefreshToken = typeof data?.refresh_token === "string" ? data.refresh_token : null;
  const expiresIn = typeof data?.expires_in === "number" ? data.expires_in : null;
  if (!accessToken || !nextRefreshToken || !expiresIn) {
    throw new MelhorEnvioAdminError("Resposta de autenticação inválida do Melhor Envio.");
  }

  await prisma.melhorEnvioCredential.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      accessToken,
      refreshToken: nextRefreshToken,
      expiraEm: new Date(Date.now() + expiresIn * 1000),
    },
    update: {
      accessToken,
      refreshToken: nextRefreshToken,
      expiraEm: new Date(Date.now() + expiresIn * 1000),
    },
  });

  return accessToken;
}

export async function getMelhorEnvioAccessToken(): Promise<string> {
  const credential = await prisma.melhorEnvioCredential.findUnique({
    where: { id: "singleton" },
  });
  if (!credential) {
    throw new MelhorEnvioAdminError("Autorize a integração com o Melhor Envio antes de gerar etiquetas.", 503);
  }
  if (credential.expiraEm.getTime() - Date.now() < REFRESH_MARGIN_MS) {
    return refreshToken(credential.refreshToken);
  }
  return credential.accessToken;
}

export async function melhorEnvioRequest(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<unknown> {
  const token = await getMelhorEnvioAccessToken();
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);

  if (!response) {
    throw new MelhorEnvioAdminError("Não foi possível conectar ao Melhor Envio.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const fallback =
      response.status === 401 || response.status === 403
        ? "A integração não possui as permissões necessárias. Reautorize o Melhor Envio."
        : "O Melhor Envio não conseguiu processar esta etapa.";
    throw new MelhorEnvioAdminError(responseMessage(data, fallback), response.status);
  }
  return data;
}

export async function melhorEnvioFileRequest(path: string): Promise<Response> {
  const token = await getMelhorEnvioAccessToken();
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "*/*",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);

  if (!response) {
    throw new MelhorEnvioAdminError("Não foi possível baixar a etiqueta do Melhor Envio.");
  }
  if (!response.ok) {
    const data = await response.clone().json().catch(() => null);
    throw new MelhorEnvioAdminError(
      responseMessage(data, "O Melhor Envio não disponibilizou este arquivo de etiqueta."),
      response.status,
    );
  }
  return response;
}

export async function getMelhorEnvioBalance(): Promise<MelhorEnvioBalance> {
  try {
    const response = await melhorEnvioRequest("/api/v2/me/balance");
    const value = findBalance(response);
    if (value === null) {
      throw new MelhorEnvioAdminError(
        "O Melhor Envio não retornou um saldo reconhecível.",
      );
    }

    const checkedAt = new Date();
    await prisma.melhorEnvioBalanceCache
      .upsert({
        where: { id: "singleton" },
        create: {
          id: "singleton",
          saldo: value,
          disponivel: true,
          consultadoEm: checkedAt,
          ultimoErro: null,
        },
        update: {
          saldo: value,
          disponivel: true,
          consultadoEm: checkedAt,
          ultimoErro: null,
        },
      })
      .catch((error: unknown) => {
        console.error("[melhor-envio-balance] Falha ao atualizar cache", error);
      });

    return {
      status: "live",
      value,
      checkedAt: checkedAt.toISOString(),
      error: null,
    };
  } catch (error) {
    const message = errorMessage(error);
    const cached = await prisma.melhorEnvioBalanceCache
      .findUnique({ where: { id: "singleton" } })
      .catch((cacheError: unknown) => {
        console.error("[melhor-envio-balance] Falha ao consultar cache", cacheError);
        return null;
      });
    if (cached?.saldo !== null && cached?.saldo !== undefined) {
      return {
        status: "stale",
        value: Number(cached.saldo),
        checkedAt: cached.consultadoEm?.toISOString() ?? null,
        error: message,
      };
    }
    return {
      status: "unavailable",
      value: null,
      checkedAt: null,
      error: message,
    };
  }
}

export function getMelhorEnvioOAuthConfig() {
  return {
    baseUrl: apiBaseUrl(),
    clientId: config.melhorEnvioClientId,
    clientSecret: config.melhorEnvioClientSecret,
  };
}
