import { config } from "@/lib/config";

type InternalApiError = { error?: unknown };

export type ShippingPreparationResult = {
  orderId: string;
  shippingMode: string;
  labelStatus: string;
  serviceId: string | null;
  carrier: string | null;
  service: string | null;
  estimatedDays: number | null;
  estimatedCost: number | null;
  fiscalDocumentType: "nota_fiscal" | "declaracao_conteudo" | null;
  fiscalDocumentConfirmedAt: string | null;
  invoiceKey: string | null;
  labelUrl: string | null;
  lastError: string | null;
  lastErrorCode: string | null;
  balance: {
    available: boolean;
    value: number | null;
    checkedAt: string | null;
    error: string | null;
  };
  autoPurchaseEnabled: boolean;
};

function apiBaseUrl() {
  if (config.storefrontUrl) return config.storefrontUrl.replace(/\/$/, "");
  return config.nodeEnv === "production"
    ? "https://www.ecomzero.com.br"
    : "http://localhost:3000";
}

type ErrorMetadata = {
  name: string | null;
  message: string | null;
  code: string | null;
  errno: string | number | null;
  syscall: string | null;
  hostname: string | null;
};

function sanitizeErrorMessage(value: unknown) {
  if (typeof value !== "string") return null;

  return value
    .replace(
      /Bearer\s+[\s\S]*?(?="\s+is an invalid header value)/gi,
      "Bearer [REDACTED]",
    )
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[REDACTED]")
    .replace(/([?&](?:token|key|secret)=)[^&\s]+/gi, "$1[REDACTED]")
    .slice(0, 1_000);
}

function errorMetadata(error: unknown): ErrorMetadata {
  if (!error || typeof error !== "object") {
    return {
      name: null,
      message: sanitizeErrorMessage(error),
      code: null,
      errno: null,
      syscall: null,
      hostname: null,
    };
  }

  const value = error as Record<string, unknown>;
  return {
    name: typeof value.name === "string" ? value.name : null,
    message: sanitizeErrorMessage(value.message),
    code: typeof value.code === "string" ? value.code : null,
    errno:
      typeof value.errno === "string" || typeof value.errno === "number"
        ? value.errno
        : null,
    syscall: typeof value.syscall === "string" ? value.syscall : null,
    hostname: typeof value.hostname === "string" ? value.hostname : null,
  };
}

async function internalRequest<T>(path: string, body?: unknown): Promise<T> {
  if (!config.storefrontSyncApiKey) {
    throw new Error(
      "Configure STOREFRONT_SYNC_API_KEY no painel para executar ações logísticas.",
    );
  }

  const method = body === undefined ? "GET" : "POST";
  const requestUrl = new URL(path, `${apiBaseUrl()}/`);
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method,
      headers: {
        Authorization: `Bearer ${config.storefrontSyncApiKey}`,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    const topLevelError = errorMetadata(error);
    const cause =
      error && typeof error === "object" && "cause" in error
        ? errorMetadata(error.cause)
        : null;

    console.error("[storefront-shipping] Falha na chamada interna", {
      ...topLevelError,
      cause,
      hostname: requestUrl.hostname,
      route: requestUrl.pathname,
      method,
      status: null,
    });

    throw new Error("Não foi possível consultar o serviço logístico da loja.");
  }

  const data = (await response.json().catch(() => null)) as InternalApiError | null;
  if (!response.ok) {
    console.error("[storefront-shipping] Resposta rejeitada pela loja", {
      name: "StorefrontShippingHttpError",
      message: sanitizeErrorMessage(data?.error) ?? "Resposta HTTP sem mensagem de erro.",
      cause: null,
      hostname: requestUrl.hostname,
      route: requestUrl.pathname,
      method,
      status: response.status,
    });

    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "Não foi possível concluir a operação logística.",
    );
  }
  return data as T;
}

export function prepareShipmentInStorefront(orderId: string, serviceId?: string) {
  return internalRequest<ShippingPreparationResult>(
    `/api/admin/shipping/orders/${orderId}/prepare`,
    serviceId ? { serviceId } : {},
  );
}

export function attachInvoiceInStorefront(orderId: string, invoiceKey: string) {
  return internalRequest<ShippingPreparationResult>(
    `/api/admin/shipping/orders/${orderId}/invoice`,
    { invoiceKey },
  );
}

export function confirmFiscalDocumentInStorefront(
  orderId: string,
  input:
    | { tipoDocumentoFiscal: "nota_fiscal" }
    | {
        tipoDocumentoFiscal: "declaracao_conteudo";
        declaracaoConfirmada: true;
      },
) {
  return internalRequest<ShippingPreparationResult>(
    `/api/admin/shipping/orders/${orderId}/fiscal-document`,
    input,
  );
}

export function purchaseShipmentInStorefront(orderId: string, serviceId?: string) {
  return internalRequest<ShippingPreparationResult>(
    `/api/admin/shipping/orders/${orderId}/purchase`,
    serviceId ? { serviceId } : {},
  );
}

export function markExternalShipmentInStorefront(orderId: string) {
  return internalRequest<{ ok: true }>(
    `/api/admin/shipping/orders/${orderId}/external`,
    {},
  );
}

export function syncShipmentInStorefront(orderId: string) {
  return internalRequest<{ ok: true }>(
    `/api/admin/shipping/orders/${orderId}/tracking`,
    {},
  );
}

export function cancelShipmentInStorefront(orderId: string) {
  return internalRequest<{ ok: true }>(
    `/api/admin/shipping/orders/${orderId}/cancel`,
    {},
  );
}
