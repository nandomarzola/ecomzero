import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { config } from "@/lib/config";

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
};

const absoluteUrl = (value: string, siteUrl: string) => {
  try {
    return new URL(value, siteUrl).toString();
  } catch {
    return undefined;
  }
};

export async function createPaymentPreference(
  order: PaymentOrderSnapshot,
  siteUrl: string,
): Promise<CreatedPaymentPreference> {
  const accessToken = config.mercadoPago.accessToken;
  if (!accessToken) {
    throw new MercadoPagoServiceError(
      "Pagamento temporariamente indisponível",
      503,
    );
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + PAYMENT_PREFERENCE_TTL_MS);
  const client = new MercadoPagoConfig({
    accessToken,
    options: { timeout: 10_000 },
  });
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
  const accessToken = config.mercadoPago.accessToken;
  if (!accessToken) {
    throw new MercadoPagoServiceError(
      "Pagamento temporariamente indisponível",
      503,
    );
  }

  try {
    const client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 10_000 },
    });
    const response = await new Payment(client).get({ id: paymentId });
    const amount = response.transaction_amount;

    if (
      response.id === undefined ||
      !response.status ||
      typeof amount !== "number" ||
      !Number.isFinite(amount)
    ) {
      throw new Error("Pagamento incompleto");
    }

    const approvedAt = response.date_approved
      ? new Date(response.date_approved)
      : null;

    return {
      id: String(response.id),
      status: response.status,
      statusDetail: response.status_detail ?? null,
      externalReference: response.external_reference ?? null,
      transactionAmount: amount,
      currencyId: response.currency_id ?? null,
      liveMode: response.live_mode === true,
      approvedAt:
        approvedAt && !Number.isNaN(approvedAt.getTime()) ? approvedAt : null,
    };
  } catch (error) {
    if (error instanceof MercadoPagoServiceError) throw error;
    throw new MercadoPagoServiceError(
      "Não foi possível confirmar o pagamento",
      502,
    );
  }
}
