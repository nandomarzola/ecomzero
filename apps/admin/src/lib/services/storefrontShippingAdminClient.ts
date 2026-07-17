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

async function internalRequest<T>(path: string, body?: unknown): Promise<T> {
  if (!config.storefrontSyncApiKey) {
    throw new Error(
      "Configure STOREFRONT_SYNC_API_KEY no painel para executar ações logísticas.",
    );
  }
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${config.storefrontSyncApiKey}`,
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  }).catch(() => null);
  if (!response) {
    throw new Error("Não foi possível consultar o serviço logístico da loja.");
  }
  const data = (await response.json().catch(() => null)) as InternalApiError | null;
  if (!response.ok) {
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

export function purchaseShipmentInStorefront(orderId: string) {
  return internalRequest<ShippingPreparationResult>(
    `/api/admin/shipping/orders/${orderId}/purchase`,
    {},
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
