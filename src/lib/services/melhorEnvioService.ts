import { config, isMelhorEnvioProducao } from "@/lib/config";
import {
  getValidAccessToken,
  MelhorEnvioAuthError,
} from "@/lib/services/melhorEnvioAuthService";

const USER_AGENT = "EcomZero (contato@ecomzero.com.br)";

type ApiObject = Record<string, unknown>;

export class MelhorEnvioServiceError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = "MelhorEnvioServiceError";
  }
}

function responseMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const object = data as ApiObject;
  if (typeof object.message === "string") return object.message;
  if (typeof object.error_description === "string") {
    return object.error_description;
  }
  if (typeof object.error === "string") return object.error;
  if (object.errors && typeof object.errors === "object") {
    const first = Object.values(object.errors as ApiObject).flat()[0];
    if (typeof first === "string") return first;
  }
  return fallback;
}

async function accessToken(): Promise<string> {
  if (!isMelhorEnvioProducao) {
    if (!config.melhorEnvio.token) {
      throw new MelhorEnvioServiceError(
        "A integração com o Melhor Envio não está configurada.",
        503,
      );
    }
    return config.melhorEnvio.token;
  }

  try {
    return await getValidAccessToken();
  } catch (error) {
    if (error instanceof MelhorEnvioAuthError) {
      throw new MelhorEnvioServiceError(
        "A integração com o Melhor Envio precisa ser reautorizada.",
        503,
      );
    }
    throw error;
  }
}

export async function melhorEnvioRequest(
  path: string,
  init: {
    method?: "GET" | "POST" | "DELETE";
    body?: unknown;
    timeoutMs?: number;
  } = {},
): Promise<unknown> {
  const token = await accessToken();
  const response = await fetch(`${config.melhorEnvio.baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(init.timeoutMs ?? 15_000),
  }).catch(() => null);

  if (!response) {
    throw new MelhorEnvioServiceError(
      "Não foi possível consultar o Melhor Envio.",
    );
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const fallback =
      response.status === 401 || response.status === 403
        ? "A integração não possui as permissões necessárias."
        : "O Melhor Envio não conseguiu processar esta etapa.";
    throw new MelhorEnvioServiceError(
      responseMessage(data, fallback),
      response.status,
    );
  }

  return data;
}

export async function melhorEnvioFileRequest(
  path: string,
): Promise<Response> {
  const token = await accessToken();
  const response = await fetch(`${config.melhorEnvio.baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "*/*",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);

  if (!response) {
    throw new MelhorEnvioServiceError(
      "Não foi possível baixar a etiqueta do Melhor Envio.",
    );
  }
  if (!response.ok) {
    const data = await response.clone().json().catch(() => null);
    throw new MelhorEnvioServiceError(
      responseMessage(
        data,
        "O Melhor Envio não disponibilizou este arquivo de etiqueta.",
      ),
      response.status,
    );
  }
  return response;
}
