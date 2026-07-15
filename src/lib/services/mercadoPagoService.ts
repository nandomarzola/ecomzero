import { createHash } from "node:crypto";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { config } from "@/lib/config";
import type { BrickPaymentInput } from "@/lib/validation/payment";

export const PAYMENT_PREFERENCE_TTL_MS = 24 * 60 * 60 * 1000;

export class MercadoPagoServiceError extends Error {
  constructor(
    message: string,
    public readonly status: 502 | 503,
  ) {
    super(message);
    this.name = "MercadoPagoServiceError";
  }
}

export type PaymentOrderSnapshot = {
  id: string;
  total: number;
  nomeCliente: string;
  emailCliente: string;
  telefoneCliente: string;
  cpfCnpj: string;
  cepDestino: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  valorFrete: number;
  items: Array<{
    id: string;
    variantId: string;
    productName: string;
    productImage: string;
    variantLabel: string;
    quantidade: number;
    precoUnitario: number;
  }>;
};

export type CreatedPaymentPreference = {
  preferenceId: string;
  initPoint: string;
  expiresAt: Date;
};

export type MercadoPagoPaymentSnapshot = {
  id: string;
  status: string;
  statusDetail: string | null;
  externalReference: string | null;
  transactionAmount: number;
  currencyId: string | null;
  liveMode: boolean;
  approvedAt: Date | null;
  paymentMethodId: string | null;
  paymentTypeId: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: Date | null;
  threeDsExternalResourceUrl: string | null;
  threeDsCreq: string | null;
};

const absoluteUrl = (value: string, siteUrl: string) => {
  try {
    return new URL(value, siteUrl).toString();
  } catch {
    return undefined;
  }
};

const getMercadoPagoClient = () => {
  const accessToken = config.mercadoPago.accessToken;
  if (!accessToken) {
    throw new MercadoPagoServiceError(
      "Pagamento temporariamente indisponível",
      503,
    );
  }

  return new MercadoPagoConfig({
    accessToken,
    options: { timeout: 10_000 },
  });
};

const parseOptionalDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizePaymentResponse = (
  response: Awaited<ReturnType<Payment["get"]>>,
): MercadoPagoPaymentSnapshot => {
  const amount = response.transaction_amount;

  if (
    response.id === undefined ||
    !response.status ||
    typeof amount !== "number" ||
    !Number.isFinite(amount)
  ) {
    throw new Error("Pagamento incompleto");
  }

  const transactionData = response.point_of_interaction?.transaction_data;

  return {
    id: String(response.id),
    status: response.status,
    statusDetail: response.status_detail ?? null,
    externalReference: response.external_reference ?? null,
    transactionAmount: amount,
    currencyId: response.currency_id ?? null,
    liveMode: response.live_mode === true,
    approvedAt: parseOptionalDate(response.date_approved),
    paymentMethodId: response.payment_method_id ?? null,
    paymentTypeId: response.payment_type_id ?? null,
    qrCode: transactionData?.qr_code ?? null,
    qrCodeBase64: transactionData?.qr_code_base64 ?? null,
    ticketUrl: transactionData?.ticket_url ?? null,
    expiresAt: parseOptionalDate(response.date_of_expiration),
    threeDsExternalResourceUrl:
      response.three_ds_info?.external_resource_url ?? null,
    threeDsCreq: response.three_ds_info?.creq ?? null,
  };
};

const splitCustomerName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? fullName,
    lastName: parts.slice(1).join(" ") || parts[0] || fullName,
  };
};

const assertFrozenOrderTotal = (order: PaymentOrderSnapshot) => {
  const frozenTotal = order.items.reduce(
    (total, item) => total + item.precoUnitario * item.quantidade,
    order.valorFrete,
  );

  if (Math.abs(frozenTotal - order.total) > 0.01) {
    throw new MercadoPagoServiceError(
      "O total do pedido precisa ser revisado antes do pagamento",
      502,
    );
  }
};

const sanitizeProviderText = (value: unknown) => {
  if (typeof value !== "string") return null;

  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<email>")
    .replace(/APP_USR-[A-Za-z0-9-]+/g, "<credential>")
    .replace(/\b\d{11,14}\b/g, "<document>")
    .slice(0, 240);
};

const getMercadoPagoFailure = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return { status: null, error: null, message: null, causes: [] };
  }

  const failure = error as Record<string, unknown>;
  const causes = Array.isArray(failure.cause)
    ? failure.cause.slice(0, 5).map((cause) => {
        const entry =
          cause && typeof cause === "object"
            ? (cause as Record<string, unknown>)
            : {};
        return {
          code: sanitizeProviderText(entry.code),
          description: sanitizeProviderText(entry.description),
        };
      })
    : [];

  return {
    status: typeof failure.status === "number" ? failure.status : null,
    error: sanitizeProviderText(failure.error),
    message: sanitizeProviderText(failure.message),
    causes,
  };
};

export async function createMercadoPagoPayment(
  order: PaymentOrderSnapshot,
  input: BrickPaymentInput,
  siteUrl: string,
): Promise<MercadoPagoPaymentSnapshot> {
  assertFrozenOrderTotal(order);

  const documentDigits = order.cpfCnpj.replace(/\D/g, "");
  const phoneDigits = order.telefoneCliente.replace(/\D/g, "");
  const { firstName, lastName } = splitCustomerName(order.nomeCliente);
  const isPix = input.formData.payment_method_id === "pix";
  const expiresAt = isPix
    ? new Date(Date.now() + PAYMENT_PREFERENCE_TTL_MS)
    : undefined;
  const idempotencyKey = createHash("sha256")
    .update(`${order.id}:${input.attemptId}`)
    .digest("hex");
  const paymentItems = order.items.map((item) => ({
    id: item.id,
    title: item.productName.slice(0, 120),
    description: item.variantLabel.slice(0, 120),
    picture_url: absoluteUrl(item.productImage, siteUrl),
    category_id: "others",
    quantity: item.quantidade,
    unit_price: item.precoUnitario,
  }));

  try {
    const response = await new Payment(getMercadoPagoClient()).create({
      body: {
        transaction_amount: order.total,
        token: input.formData.token,
        description: `Pedido EcomZero ${order.id.slice(0, 8)}`,
        installments: isPix ? undefined : input.formData.installments ?? 1,
        payment_method_id: input.formData.payment_method_id,
        issuer_id: input.formData.issuer_id
          ? Number(input.formData.issuer_id)
          : undefined,
        external_reference: order.id,
        statement_descriptor: isPix ? undefined : "ECOMZERO",
        notification_url: new URL(
          "/api/webhooks/mercadopago",
          siteUrl,
        ).toString(),
        date_of_expiration: expiresAt?.toISOString(),
        capture: isPix ? undefined : true,
        binary_mode: isPix ? undefined : false,
        three_d_secure_mode: isPix ? undefined : "optional",
        metadata: { order_id: order.id },
        payer: {
          email: order.emailCliente,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: documentDigits.length === 14 ? "CNPJ" : "CPF",
            number: documentDigits,
          },
          phone: isPix
            ? undefined
            : {
                area_code: phoneDigits.slice(0, 2),
                number: phoneDigits.slice(2),
              },
          address: isPix
            ? undefined
            : {
                zip_code: order.cepDestino.replace(/\D/g, ""),
                street_name: order.logradouro,
                street_number: order.numero,
                neighborhood: order.bairro,
                city: order.cidade,
                federal_unit: order.uf,
              },
        },
        additional_info: isPix
          ? { items: paymentItems }
          : {
              items: paymentItems,
              payer: {
                first_name: firstName,
                last_name: lastName,
                phone: {
                  area_code: phoneDigits.slice(0, 2),
                  number: phoneDigits.slice(2),
                },
                address: {
                  zip_code: order.cepDestino.replace(/\D/g, ""),
                  street_name: order.logradouro,
                  street_number: order.numero,
                },
              },
              shipments: {
                mode: "not_specified",
                cost: order.valorFrete,
                receiver_address: {
                  zip_code: order.cepDestino.replace(/\D/g, ""),
                  street_name: order.logradouro,
                  street_number: order.numero,
                  apartment: order.complemento ?? undefined,
                  city_name: order.cidade,
                  state_name: order.uf,
                  country_name: "Brasil",
                },
              },
            },
      },
      requestOptions: { idempotencyKey },
    });

    return normalizePaymentResponse(response);
  } catch (error) {
    if (error instanceof MercadoPagoServiceError) throw error;

    const failure = getMercadoPagoFailure(error);
    console.error("Mercado Pago payment creation failed", {
      orderReference: order.id.slice(0, 8),
      paymentMethod: input.formData.payment_method_id,
      providerStatus: failure.status,
      providerError: failure.error,
      providerMessage: failure.message,
      providerCauses: failure.causes,
    });

    if (failure.status === 401 || failure.status === 403) {
      throw new MercadoPagoServiceError(
        "Pagamento temporariamente indisponível. Tente novamente mais tarde.",
        503,
      );
    }

    throw new MercadoPagoServiceError(
      "Não foi possível processar o pagamento. Confira os dados e tente novamente.",
      502,
    );
  }
}

export async function createPaymentPreference(
  order: PaymentOrderSnapshot,
  siteUrl: string,
): Promise<CreatedPaymentPreference> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PAYMENT_PREFERENCE_TTL_MS);
  const client = getMercadoPagoClient();
  const preference = new Preference(client);
  const phoneDigits = order.telefoneCliente.replace(/\D/g, "");
  const documentDigits = order.cpfCnpj.replace(/\D/g, "");
  const items = order.items.map((item) => ({
    id: item.id,
    title: item.productName.slice(0, 120),
    description: item.variantLabel.slice(0, 120),
    picture_url: absoluteUrl(item.productImage, siteUrl),
    category_id: "others",
    quantity: item.quantidade,
    currency_id: "BRL",
    unit_price: item.precoUnitario,
  }));
  assertFrozenOrderTotal(order);

  if (order.valorFrete > 0) {
    // O frete entra como item congelado. Não o repetimos em shipments.cost,
    // pois o Mercado Pago somaria os dois valores na cobrança.
    items.push({
      id: `frete-${order.id}`,
      title: "Frete",
      description: "Entrega do pedido EcomZero",
      picture_url: undefined,
      category_id: "others",
      quantity: 1,
      currency_id: "BRL",
      unit_price: order.valorFrete,
    });
  }

  try {
    const response = await preference.create({
      body: {
        items,
        external_reference: order.id,
        statement_descriptor: "ECOMZERO",
        expires: true,
        expiration_date_from: now.toISOString(),
        expiration_date_to: expiresAt.toISOString(),
        auto_return: "approved",
        back_urls: {
          success: new URL(`/pedido/${order.id}/sucesso`, siteUrl).toString(),
          pending: new URL(`/pedido/${order.id}/pendente`, siteUrl).toString(),
          failure: new URL(`/pedido/${order.id}/falha`, siteUrl).toString(),
        },
        notification_url: new URL(
          "/api/webhooks/mercadopago",
          siteUrl,
        ).toString(),
        payer: {
          name: order.nomeCliente,
          email: order.emailCliente,
          phone: {
            area_code: phoneDigits.slice(0, 2),
            number: phoneDigits.slice(2),
          },
          identification: {
            type: documentDigits.length === 14 ? "CNPJ" : "CPF",
            number: documentDigits,
          },
          address: {
            zip_code: order.cepDestino,
            street_name: order.logradouro,
            street_number: order.numero,
          },
        },
        shipments: {
          mode: "not_specified",
          receiver_address: {
            zip_code: order.cepDestino,
            street_name: order.logradouro,
            street_number: order.numero,
            apartment: order.complemento ?? undefined,
            city_name: order.cidade,
            state_name: order.uf,
            country_name: "Brasil",
          },
        },
      },
      requestOptions: {
        idempotencyKey: `ecomzero-order-${order.id}`,
      },
    });
    const initPoint = config.mercadoPago.environment === "test"
      ? response.sandbox_init_point ?? response.init_point
      : response.init_point ?? response.sandbox_init_point;

    if (!response.id || !initPoint) {
      throw new Error("Preferência sem URL de checkout");
    }

    return {
      preferenceId: response.id,
      initPoint,
      expiresAt,
    };
  } catch (error) {
    if (error instanceof MercadoPagoServiceError) throw error;
    throw new MercadoPagoServiceError(
      "Não foi possível iniciar o pagamento. Tente novamente.",
      502,
    );
  }
}

export async function getMercadoPagoPayment(
  paymentId: string,
): Promise<MercadoPagoPaymentSnapshot> {
  try {
    const response = await new Payment(getMercadoPagoClient()).get({
      id: paymentId,
    });
    return normalizePaymentResponse(response);
  } catch (error) {
    if (error instanceof MercadoPagoServiceError) throw error;
    throw new MercadoPagoServiceError(
      "Não foi possível confirmar o pagamento",
      502,
    );
  }
}
