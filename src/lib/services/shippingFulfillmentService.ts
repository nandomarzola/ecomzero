import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import {
  MelhorEnvioServiceError,
  melhorEnvioRequest,
} from "@/lib/services/melhorEnvioService";
import { FREE_SHIPPING_MINIMUM } from "@/lib/shippingPolicy";
import { applyProviderShipmentUpdate } from "@/lib/services/shipmentStatusService";
import {
  isValidNfeKey,
  shouldAutomaticallyPurchase,
} from "@/lib/shipping/shippingDomain";

const MELHOR_ENVIO_SERVICES = "1,2,3,4,17,27,31,32,33";
const QUOTE_TTL_MS = 15 * 60 * 1000;
const BALANCE_CACHE_TTL_MS = 60 * 1000;
const PROCESSING_LEASE_MS = 5 * 60 * 1000;

type JsonObject = Record<string, unknown>;

type ShippingOption = {
  id: string;
  transportadora: string;
  servico: string;
  preco: number;
  prazoDias: number;
};

export type FiscalDocumentType = "nota_fiscal" | "declaracao_conteudo";

export type MelhorEnvioBalance = {
  available: boolean;
  value: number | null;
  checkedAt: string | null;
  error: string | null;
};

export type ShipmentPreparation = {
  orderId: string;
  shippingMode:
    | "legacy"
    | "melhor_envio"
    | "free_shipping_coupon"
    | "free_shipping_threshold"
    | "external";
  labelStatus: string;
  serviceId: string | null;
  carrier: string | null;
  service: string | null;
  estimatedDays: number | null;
  estimatedCost: number | null;
  fiscalDocumentType: FiscalDocumentType | null;
  fiscalDocumentConfirmedAt: string | null;
  invoiceKey: string | null;
  labelUrl: string | null;
  lastError: string | null;
  lastErrorCode: string | null;
  balance: MelhorEnvioBalance;
  autoPurchaseEnabled: boolean;
};

export class ShippingFulfillmentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ShippingFulfillmentError";
  }
}

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function shipmentResponseObject(value: unknown): JsonObject | null {
  const object = asObject(value);
  if (!object) return null;
  if ("status" in object || "tracking" in object || "protocol" in object) {
    return object;
  }
  for (const nested of Object.values(object)) {
    const found = shipmentResponseObject(nested);
    if (found) return found;
  }
  return null;
}

function safeError(error: unknown): string {
  if (error instanceof MelhorEnvioServiceError) return error.message.slice(0, 500);
  if (error instanceof ShippingFulfillmentError) return error.message.slice(0, 500);
  return "Não foi possível concluir a preparação logística.";
}

function normalizeDigits(value: string | null | undefined): string {
  return value?.replace(/\D/g, "") ?? "";
}

export function validateNfeKey(value: string): string {
  const key = normalizeDigits(value);
  if (key.length !== 44) {
    throw new ShippingFulfillmentError(
      "A chave da NF-e deve possuir exatamente 44 dígitos.",
      "INVALID_INVOICE_KEY",
    );
  }

  if (!isValidNfeKey(key)) {
    throw new ShippingFulfillmentError(
      "A chave da NF-e possui dígito verificador inválido.",
      "INVALID_INVOICE_KEY",
    );
  }
  return key;
}

function findBalance(value: unknown): number | null {
  const object = asObject(value);
  if (!object) return null;
  for (const key of ["balance", "saldo", "available_balance", "current_balance"]) {
    const candidate = object[key];
    const number =
      typeof candidate === "number"
        ? candidate
        : typeof candidate === "string"
          ? Number(candidate.replace(",", "."))
          : Number.NaN;
    if (Number.isFinite(number) && number >= 0) return number;
  }
  for (const nested of Object.values(object)) {
    if (nested && typeof nested === "object") {
      const found = findBalance(nested);
      if (found !== null) return found;
    }
  }
  return null;
}

function findCancellationEligibility(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const eligibility = findCancellationEligibility(item);
      if (eligibility !== null) return eligibility;
    }
    return null;
  }
  const object = asObject(value);
  if (!object) return null;
  for (const key of [
    "cancellable",
    "cancelable",
    "is_cancellable",
    "can_cancel",
    "canCancel",
  ]) {
    const candidate = object[key];
    if (typeof candidate === "boolean") return candidate;
    if (candidate === "true" || candidate === "1") return true;
    if (candidate === "false" || candidate === "0") return false;
  }
  for (const nested of Object.values(object)) {
    const eligibility = findCancellationEligibility(nested);
    if (eligibility !== null) return eligibility;
  }
  return null;
}

export async function getMelhorEnvioBalance(options?: {
  force?: boolean;
}): Promise<MelhorEnvioBalance> {
  const cached = await prisma.melhorEnvioBalanceCache.findUnique({
    where: { id: "singleton" },
  });
  if (
    !options?.force &&
    cached?.consultadoEm &&
    Date.now() - cached.consultadoEm.getTime() < BALANCE_CACHE_TTL_MS
  ) {
    return {
      available: cached.disponivel,
      value: cached.saldo === null ? null : Number(cached.saldo),
      checkedAt: cached.consultadoEm.toISOString(),
      error: cached.ultimoErro,
    };
  }

  const checkedAt = new Date();
  try {
    const response = await melhorEnvioRequest("/api/v2/me/balance");
    const balance = findBalance(response);
    if (balance === null) {
      throw new ShippingFulfillmentError(
        "O Melhor Envio não retornou um saldo reconhecível.",
        "BALANCE_UNAVAILABLE",
      );
    }
    await prisma.melhorEnvioBalanceCache.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        saldo: balance,
        disponivel: true,
        consultadoEm: checkedAt,
      },
      update: {
        saldo: balance,
        disponivel: true,
        consultadoEm: checkedAt,
        ultimoErro: null,
      },
    });
    return {
      available: true,
      value: balance,
      checkedAt: checkedAt.toISOString(),
      error: null,
    };
  } catch (error) {
    const message = safeError(error);
    await prisma.melhorEnvioBalanceCache.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        saldo: null,
        disponivel: false,
        consultadoEm: checkedAt,
        ultimoErro: message,
      },
      update: {
        saldo: null,
        disponivel: false,
        consultadoEm: checkedAt,
        ultimoErro: message,
      },
    });
    return {
      available: false,
      value: null,
      checkedAt: checkedAt.toISOString(),
      error: message,
    };
  }
}

async function addEvent(
  shipmentId: string,
  type: string,
  status: ShipmentPreparation["labelStatus"] | null,
  message?: string,
  metadata?: Prisma.InputJsonValue,
) {
  await prisma.shipmentEvent.create({
    data: {
      shipmentId,
      type,
      status: status as never,
      message: message?.slice(0, 500),
      metadata,
    },
  });
}

function orderShippingMode(order: {
  shippingMode: ShipmentPreparation["shippingMode"];
  shippingOptionId: string | null;
  subtotal: Prisma.Decimal;
  valorFrete: Prisma.Decimal;
  coupon: { tipo: string } | null;
}): ShipmentPreparation["shippingMode"] {
  if (order.shippingMode !== "legacy") return order.shippingMode;
  if (order.shippingOptionId) return "melhor_envio";
  if (order.coupon?.tipo === "frete_gratis") return "free_shipping_coupon";
  if (
    Number(order.valorFrete) === 0 &&
    Number(order.subtotal) >= FREE_SHIPPING_MINIMUM
  ) {
    return "free_shipping_threshold";
  }
  return "legacy";
}

function validateOrderData(order: Awaited<ReturnType<typeof loadOrder>>) {
  if (!order) {
    throw new ShippingFulfillmentError(
      "Pedido não encontrado.",
      "ORDER_NOT_FOUND",
    );
  }
  if (order.status !== "pago") {
    throw new ShippingFulfillmentError(
      "A preparação logística depende da confirmação do pagamento.",
      "ORDER_NOT_PAID",
    );
  }

  const address = [
    order.nomeCliente,
    order.emailCliente,
    order.telefoneCliente,
    order.cpfCnpj,
    order.cepDestino,
    order.logradouro,
    order.numero,
    order.bairro,
    order.cidade,
    order.uf,
  ];
  if (address.some((field) => !field?.trim())) {
    throw new ShippingFulfillmentError(
      "Este pedido precisa de informações de envio antes de gerar a etiqueta.",
      "MISSING_SHIPPING_DATA",
    );
  }
  if (![11, 14].includes(normalizeDigits(order.cpfCnpj).length)) {
    throw new ShippingFulfillmentError(
      "O CPF ou CNPJ do destinatário é inválido.",
      "INVALID_RECIPIENT_DOCUMENT",
    );
  }
  if (order.items.length === 0) {
    throw new ShippingFulfillmentError(
      "O pedido não possui produtos para envio.",
      "MISSING_PACKAGE_DATA",
    );
  }
  const invalidPackage = order.items.some(
    (item) =>
      item.quantidade <= 0 ||
      !Number.isFinite(item.variant.pesoKg) ||
      item.variant.pesoKg <= 0 ||
      !Number.isFinite(item.variant.alturaCm) ||
      item.variant.alturaCm <= 0 ||
      !Number.isFinite(item.variant.larguraCm) ||
      item.variant.larguraCm <= 0 ||
      !Number.isFinite(item.variant.comprimentoCm) ||
      item.variant.comprimentoCm <= 0,
  );
  if (invalidPackage) {
    throw new ShippingFulfillmentError(
      "Um ou mais produtos não possuem peso e dimensões válidos.",
      "MISSING_PACKAGE_DATA",
    );
  }
}

async function loadOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      coupon: { select: { tipo: true } },
      shipment: true,
      items: {
        include: {
          variant: { include: { product: true } },
        },
      },
    },
  });
}

async function calculateOrderOptions(
  order: NonNullable<Awaited<ReturnType<typeof loadOrder>>>,
  originCep: string,
): Promise<ShippingOption[]> {
  const weight = order.items.reduce(
    (total, item) => total + item.variant.pesoKg * item.quantidade,
    0,
  );
  const response = await melhorEnvioRequest(
    "/api/v2/me/shipment/calculate",
    {
      method: "POST",
      body: {
        from: { postal_code: normalizeDigits(originCep) },
        to: { postal_code: normalizeDigits(order.cepDestino) },
        package: {
          height: Math.max(...order.items.map((item) => item.variant.alturaCm)),
          width: Math.max(...order.items.map((item) => item.variant.larguraCm)),
          length: Math.max(
            ...order.items.map((item) => item.variant.comprimentoCm),
          ),
          weight: Math.round(weight * 1000) / 1000,
        },
        services: MELHOR_ENVIO_SERVICES,
      },
    },
  );
  if (!Array.isArray(response)) {
    throw new ShippingFulfillmentError(
      "O Melhor Envio retornou uma cotação inválida.",
      "QUOTE_UNAVAILABLE",
    );
  }

  const options = response
    .map((entry): ShippingOption | null => {
      const quote = asObject(entry);
      const company = asObject(quote?.company);
      const id = quote?.id;
      const price = Number(quote?.price);
      const days = Number(quote?.delivery_time);
      if (
        quote?.error ||
        (typeof id !== "number" && typeof id !== "string") ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isFinite(days)
      ) {
        return null;
      }
      return {
        id: String(id),
        transportadora: optionalString(company?.name) ?? "Transportadora",
        servico: optionalString(quote?.name) ?? "Serviço de entrega",
        preco: price,
        prazoDias: days,
      };
    })
    .filter((option): option is ShippingOption => option !== null)
    .sort((a, b) => a.preco - b.preco || a.prazoDias - b.prazoDias);

  if (options.length === 0) {
    throw new ShippingFulfillmentError(
      "Nenhuma transportadora atende o endereço deste pedido.",
      "QUOTE_UNAVAILABLE",
    );
  }
  return options;
}

function preparationFromShipment(
  orderId: string,
  mode: ShipmentPreparation["shippingMode"],
  shipment: NonNullable<Awaited<ReturnType<typeof loadOrder>>>["shipment"],
  balance: MelhorEnvioBalance,
): ShipmentPreparation {
  return {
    orderId,
    shippingMode: mode,
    labelStatus: shipment?.labelStatus ?? "awaiting_shipping_data",
    serviceId: shipment?.serviceId ?? null,
    carrier: shipment?.transportadora ?? null,
    service: shipment?.servico ?? null,
    estimatedDays: shipment?.prazoDias ?? null,
    estimatedCost:
      shipment?.custoEstimado === null || shipment?.custoEstimado === undefined
        ? null
        : Number(shipment.custoEstimado),
    fiscalDocumentType: shipment?.tipoDocumentoFiscal ?? null,
    fiscalDocumentConfirmedAt:
      shipment?.tipoDocumentoFiscalConfirmadoEm?.toISOString() ?? null,
    invoiceKey: shipment?.chaveNotaFiscal ?? null,
    labelUrl: shipment?.urlEtiqueta ?? null,
    lastError: shipment?.ultimoErro ?? null,
    lastErrorCode: shipment?.ultimoErroCodigo ?? null,
    balance,
    autoPurchaseEnabled: config.melhorEnvio.autoPurchaseEnabled,
  };
}

export async function prepareOrderShipment(
  orderId: string,
  preference?: { preferredServiceId?: string },
): Promise<ShipmentPreparation> {
  const [order, settings] = await Promise.all([
    loadOrder(orderId),
    prisma.shippingSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!order) {
    throw new ShippingFulfillmentError(
      "Pedido não encontrado.",
      "ORDER_NOT_FOUND",
    );
  }
  const mode = orderShippingMode(order);

  if (order.status !== "pago") {
    const shipment = await prisma.shipment.upsert({
      where: { orderId },
      create: {
        orderId,
        status: "awaiting_payment",
        labelStatus: "awaiting_payment",
      },
      update: {
        status: "awaiting_payment",
        labelStatus: "awaiting_payment",
      },
    });
    return preparationFromShipment(orderId, mode, shipment, {
      available: false,
      value: null,
      checkedAt: null,
      error: null,
    });
  }

  if (mode === "external") {
    const shipment = await prisma.shipment.upsert({
      where: { orderId },
      create: {
        orderId,
        status: "external",
        labelStatus: "external",
        labelSource: "external",
      },
      update: {
        status: "external",
        labelStatus: "external",
        labelSource: "external",
      },
    });
    return preparationFromShipment(orderId, mode, shipment, {
      available: false,
      value: null,
      checkedAt: null,
      error: null,
    });
  }

  const terminal = new Set([
    "purchased",
    "generated",
    "printed",
    "posted",
    "in_transit",
    "delivered",
  ]);
  if (order.shipment && terminal.has(order.shipment.labelStatus)) {
    return preparationFromShipment(
      orderId,
      mode,
      order.shipment,
      await getMelhorEnvioBalance(),
    );
  }
  if (
    order.shipment?.labelStatus === "processing" &&
    order.shipment.processandoEm &&
    Date.now() - order.shipment.processandoEm.getTime() < PROCESSING_LEASE_MS
  ) {
    return preparationFromShipment(
      orderId,
      mode,
      order.shipment,
      await getMelhorEnvioBalance(),
    );
  }

  try {
    validateOrderData(order);
    if (!settings) {
      throw new ShippingFulfillmentError(
        "Cadastre os dados do remetente na página Fretes.",
        "MISSING_SENDER_DATA",
      );
    }

    const options = await calculateOrderOptions(order, settings.cepOrigem);
    const selectedServiceId =
      preference?.preferredServiceId ?? order.shippingOptionId;
    const selected = selectedServiceId
      ? options.find((option) => option.id === selectedServiceId)
      : options[0];
    if (!selected) {
      throw new ShippingFulfillmentError(
        "O serviço escolhido não está mais disponível. Selecione outro frete.",
        "SHIPPING_SERVICE_UNAVAILABLE",
      );
    }

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + QUOTE_TTL_MS);
    const quote = await prisma.checkoutShippingQuote.upsert({
      where: { orderId },
      create: {
        orderId,
        cep: normalizeDigits(order.cepDestino),
        options,
        createdAt,
        expiresAt,
      },
      update: {
        cep: normalizeDigits(order.cepDestino),
        options,
        createdAt,
        expiresAt,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingMode: mode,
        shippingProvider: "melhor_envio",
        shippingService: selected.servico,
        shippingAmountCharged: order.valorFrete,
        shippingPayer:
          mode === "melhor_envio" ? "customer" : "store",
        shippingEstimatedDays: selected.prazoDias,
        shippingQuoteId: quote.id,
        shippingOptionId: selected.id,
      },
    });

    const balance = await getMelhorEnvioBalance();
    const fiscalType = order.shipment?.tipoDocumentoFiscalConfirmadoEm
      ? order.shipment.tipoDocumentoFiscal
      : null;
    const senderDocument = normalizeDigits(settings.cpfCnpjRemetente);
    if (fiscalType === "nota_fiscal") {
      if (senderDocument.length !== 14) {
        throw new ShippingFulfillmentError(
          "Envio com NF-e exige CNPJ válido do remetente.",
          "INVALID_SENDER_DOCUMENT",
        );
      }
      if (!settings.inscricaoEstadual?.trim()) {
        throw new ShippingFulfillmentError(
          "Informe a inscrição estadual do remetente para usar NF-e.",
          "MISSING_STATE_REGISTER",
        );
      }
    } else if (
      fiscalType === "declaracao_conteudo" &&
      ![11, 14].includes(senderDocument.length)
    ) {
      throw new ShippingFulfillmentError(
        "A declaração de conteúdo exige CPF ou CNPJ válido do remetente.",
        "INVALID_SENDER_DOCUMENT",
      );
    }
    const invoiceKey = order.shipment?.chaveNotaFiscal ?? null;
    const invoiceValid = fiscalType === "nota_fiscal" && invoiceKey
      ? (() => {
          try {
            validateNfeKey(invoiceKey);
            return true;
          } catch {
            return false;
          }
        })()
      : false;
    const fiscalDocumentReady =
      fiscalType === "declaracao_conteudo" || invoiceValid;

    let labelStatus:
      | "awaiting_fiscal_document"
      | "awaiting_invoice"
      | "ready_to_purchase"
      | "insufficient_balance"
      | "error" = fiscalType ? "awaiting_invoice" : "awaiting_fiscal_document";
    let errorCode: string | null = null;
    let errorMessage: string | null = null;
    if (fiscalDocumentReady && !balance.available) {
      labelStatus = "error";
      errorCode = "BALANCE_UNAVAILABLE";
      errorMessage = "Não foi possível consultar o saldo da Melhor Carteira.";
    } else if (
      fiscalDocumentReady &&
      balance.value !== null &&
      balance.value < selected.preco
    ) {
      labelStatus = "insufficient_balance";
      errorCode = "INSUFFICIENT_BALANCE";
      errorMessage = "Saldo insuficiente na Melhor Carteira.";
    } else if (fiscalDocumentReady) {
      labelStatus = "ready_to_purchase";
    }

    const shipment = await prisma.shipment.upsert({
      where: { orderId },
      create: {
        orderId,
        status: "prepared",
        labelStatus,
        serviceId: selected.id,
        transportadora: selected.transportadora,
        servico: selected.servico,
        prazoDias: selected.prazoDias,
        custoEstimado: selected.preco,
        ultimoErro: errorMessage,
        ultimoErroCodigo: errorCode,
        saldoConsultadoEm: balance.checkedAt
          ? new Date(balance.checkedAt)
          : null,
      },
      update: {
        status: "prepared",
        labelStatus,
        serviceId: selected.id,
        transportadora: selected.transportadora,
        servico: selected.servico,
        prazoDias: selected.prazoDias,
        custoEstimado: selected.preco,
        ultimoErro: errorMessage,
        ultimoErroCodigo: errorCode,
        saldoConsultadoEm: balance.checkedAt
          ? new Date(balance.checkedAt)
          : null,
        processandoEm: null,
        processamentoToken: null,
      },
    });
    await addEvent(
      shipment.id,
      "prepared",
      labelStatus,
      labelStatus === "awaiting_fiscal_document"
        ? "Preparação concluída. Aguardando confirmação do documento fiscal."
        : labelStatus === "awaiting_invoice"
          ? "Preparação concluída. Aguardando chave da NF-e."
          : errorMessage ?? "Pedido pronto para compra da etiqueta.",
      {
        serviceId: selected.id,
        estimatedCost: selected.preco,
        quoteExpiresAt: expiresAt.toISOString(),
      },
    );
    return preparationFromShipment(orderId, mode, shipment, balance);
  } catch (error) {
    const code =
      error instanceof ShippingFulfillmentError
        ? error.code
        : "PREPARATION_ERROR";
    const message = safeError(error);
    const shipment = await prisma.shipment.upsert({
      where: { orderId },
      create: {
        orderId,
        status: "preparation_error",
        labelStatus: "awaiting_shipping_data",
        ultimoErro: message,
        ultimoErroCodigo: code,
      },
      update: {
        status: "preparation_error",
        labelStatus: "awaiting_shipping_data",
        ultimoErro: message,
        ultimoErroCodigo: code,
        processandoEm: null,
        processamentoToken: null,
      },
    });
    await addEvent(
      shipment.id,
      "preparation_error",
      "awaiting_shipping_data",
      message,
    );
    return preparationFromShipment(orderId, mode, shipment, {
      available: false,
      value: null,
      checkedAt: null,
      error: null,
    });
  }
}

function findTaggedShipment(value: unknown, orderId: string): JsonObject | null {
  const list = Array.isArray(value)
    ? value
    : Array.isArray(asObject(value)?.data)
      ? (asObject(value)?.data as unknown[])
      : [];
  for (const item of list) {
    const object = asObject(item);
    if (!object) continue;
    const tags = Array.isArray(object.tags) ? object.tags : [];
    const matches = tags.some(
      (tag) => optionalString(asObject(tag)?.tag) === orderId,
    );
    if (matches && optionalString(object.id)) return object;
  }
  return null;
}

async function buildCartPayload(
  order: NonNullable<Awaited<ReturnType<typeof loadOrder>>>,
  settings: NonNullable<
    Awaited<ReturnType<typeof prisma.shippingSettings.findUnique>>
  >,
) {
  const shipment = order.shipment;
  if (
    !shipment?.serviceId ||
    !shipment.tipoDocumentoFiscal ||
    !shipment.tipoDocumentoFiscalConfirmadoEm
  ) {
    throw new ShippingFulfillmentError(
      "A preparação logística ou a confirmação do documento fiscal está ausente.",
      "NOT_READY",
    );
  }
  const senderDocument = normalizeDigits(settings.cpfCnpjRemetente);
  if (![11, 14].includes(senderDocument.length)) {
    throw new ShippingFulfillmentError(
      "O CPF ou CNPJ do remetente é inválido.",
      "MISSING_SENDER_DATA",
    );
  }
  const invoiceKey =
    shipment.tipoDocumentoFiscal === "nota_fiscal"
      ? validateNfeKey(shipment.chaveNotaFiscal ?? "")
      : null;
  if (
    shipment.tipoDocumentoFiscal === "nota_fiscal" &&
    (senderDocument.length !== 14 || !settings.inscricaoEstadual?.trim())
  ) {
    throw new ShippingFulfillmentError(
      "Os dados fiscais do remetente estão incompletos para a NF-e.",
      "MISSING_SENDER_DATA",
    );
  }
  const recipientDocument = normalizeDigits(order.cpfCnpj);
  const products = order.items.map((item) => ({
    name: item.variant.product.nome.slice(0, 100),
    quantity: item.quantidade,
    unitary_value: Number(item.precoUnitario),
  }));
  return {
    service: Number(shipment.serviceId),
    from: {
      name: settings.nomeRemetente,
      email: settings.emailRemetente,
      phone: normalizeDigits(settings.telefoneRemetente),
      ...(senderDocument.length === 14
        ? {
            company_document: senderDocument,
            state_register:
              shipment.tipoDocumentoFiscal === "nota_fiscal"
                ? settings.inscricaoEstadual?.trim()
                : "ISENTO",
            ...(settings.atividadeEconomica
              ? { economic_activity_code: settings.atividadeEconomica }
              : {}),
          }
        : { document: senderDocument, state_register: "ISENTO" }),
      address: settings.logradouroOrigem,
      complement: settings.complementoOrigem ?? "",
      number: settings.numeroOrigem,
      district: settings.bairroOrigem,
      city: settings.cidadeOrigem,
      postal_code: normalizeDigits(settings.cepOrigem),
      state_abbr: settings.ufOrigem,
    },
    to: {
      name: order.nomeCliente,
      email: order.emailCliente,
      phone: normalizeDigits(order.telefoneCliente),
      ...(recipientDocument.length === 14
        ? { company_document: recipientDocument }
        : { document: recipientDocument }),
      address: order.logradouro,
      complement: order.complemento ?? "",
      number: order.numero,
      district: order.bairro,
      city: order.cidade,
      postal_code: normalizeDigits(order.cepDestino),
      country_id: "BR",
      state_abbr: order.uf,
    },
    products,
    volumes: [
      {
        height: Math.max(...order.items.map((item) => item.variant.alturaCm)),
        width: Math.max(...order.items.map((item) => item.variant.larguraCm)),
        length: Math.max(
          ...order.items.map((item) => item.variant.comprimentoCm),
        ),
        weight:
          Math.round(
            order.items.reduce(
              (total, item) =>
                total + item.variant.pesoKg * item.quantidade,
              0,
            ) * 1000,
          ) / 1000,
      },
    ],
    options: {
      platform: "EcomZero",
      reminder: `Pedido #${order.id.slice(0, 8)}`,
      insurance_value: Number(order.subtotal),
      receipt: false,
      own_hand: false,
      reverse: false,
      ...(invoiceKey ? { invoice: { key: invoiceKey } } : {}),
      tags: [
        {
          tag: order.id,
          url: `https://www.ecomzero.com.br/conta/pedidos/${order.id}`,
        },
      ],
    },
  };
}

async function updateFailure(
  orderId: string,
  token: string,
  error: unknown,
) {
  const message = safeError(error);
  const errorCode =
    error instanceof ShippingFulfillmentError
      ? error.code
      : "PROVIDER_ERROR";
  const insufficient = errorCode === "INSUFFICIENT_BALANCE";
  const labelStatus = insufficient ? "insufficient_balance" : "error";
  const updated = await prisma.shipment.updateMany({
    where: { orderId, processamentoToken: token },
    data: {
      status: "error",
      labelStatus,
      ultimoErro: message,
      ultimoErroCodigo: errorCode,
      processandoEm: null,
      processamentoToken: null,
    },
  });
  if (updated.count === 1) {
    const shipment = await prisma.shipment.findUniqueOrThrow({ where: { orderId } });
    await addEvent(shipment.id, "purchase_error", labelStatus, message);
  }
}

export async function executeShipmentPurchase(
  orderId: string,
  source: "automatic" | "manual",
  preference?: { preferredServiceId?: string },
): Promise<ShipmentPreparation> {
  const preparation = await prepareOrderShipment(orderId, preference);
  if (
    ["generated", "printed", "posted", "in_transit", "delivered"].includes(
      preparation.labelStatus,
    )
  ) {
    return preparation;
  }
  if (
    source === "automatic" &&
    !config.melhorEnvio.autoPurchaseEnabled
  ) {
    return preparation;
  }
  if (source === "automatic" && preparation.shippingMode !== "melhor_envio") {
    return preparation;
  }
  if (!["ready_to_purchase", "purchased"].includes(preparation.labelStatus)) {
    return preparation;
  }

  const token = randomUUID();
  const staleBefore = new Date(Date.now() - PROCESSING_LEASE_MS);
  const claimed = await prisma.shipment.updateMany({
    where: {
      orderId,
      labelStatus: { in: ["ready_to_purchase", "purchased"] },
      OR: [{ processandoEm: null }, { processandoEm: { lt: staleBefore } }],
    },
    data: {
      status: "processing",
      labelStatus: "processing",
      labelSource: source,
      processandoEm: new Date(),
      processamentoToken: token,
      ultimaTentativaEm: new Date(),
      tentativas: { increment: 1 },
      ultimoErro: null,
      ultimoErroCodigo: null,
    },
  });
  if (claimed.count !== 1) {
    const current = await loadOrder(orderId);
    return preparationFromShipment(
      orderId,
      current ? orderShippingMode(current) : preparation.shippingMode,
      current?.shipment ?? null,
      await getMelhorEnvioBalance(),
    );
  }

  const claimedShipment = await prisma.shipment.findUnique({
    where: { orderId },
  });
  if (claimedShipment) {
    await addEvent(
      claimedShipment.id,
      "processing_started",
      "processing",
      source === "automatic"
        ? "Compra automática iniciada."
        : "Compra manual iniciada.",
    );
  }

  try {
    const [order, settings, balance] = await Promise.all([
      loadOrder(orderId),
      prisma.shippingSettings.findUnique({ where: { id: "singleton" } }),
      getMelhorEnvioBalance({ force: true }),
    ]);
    if (!order || !settings) {
      throw new ShippingFulfillmentError(
        "Os dados do pedido ou do remetente estão incompletos.",
        "MISSING_SHIPPING_DATA",
      );
    }
    validateOrderData(order);
    if (
      !order.shipment?.custoEstimado ||
      !order.shipment.tipoDocumentoFiscal ||
      !order.shipment.tipoDocumentoFiscalConfirmadoEm
    ) {
      throw new ShippingFulfillmentError(
        "A preparação logística está incompleta.",
        "NOT_READY",
      );
    }
    if (order.shipment.tipoDocumentoFiscal === "nota_fiscal") {
      validateNfeKey(order.shipment.chaveNotaFiscal ?? "");
    }
    const cost = Number(order.shipment.custoEstimado);
    const alreadyPurchased = Boolean(order.shipment.compradoEm);
    if (!alreadyPurchased && (!balance.available || balance.value === null)) {
      throw new ShippingFulfillmentError(
        "Não foi possível consultar o saldo da Melhor Carteira.",
        "BALANCE_UNAVAILABLE",
      );
    }
    if (!alreadyPurchased && balance.value !== null && balance.value < cost) {
      throw new ShippingFulfillmentError(
        "Saldo insuficiente na Melhor Carteira.",
        "INSUFFICIENT_BALANCE",
      );
    }
    let melhorEnvioId = order.shipment.melhorEnvioId;
    let protocol = order.shipment.melhorEnvioProtocol;
    if (!melhorEnvioId) {
      const cart = await melhorEnvioRequest("/api/v2/me/cart");
      const recovered = findTaggedShipment(cart, orderId);
      if (recovered) {
        melhorEnvioId = optionalString(recovered.id);
        protocol = optionalString(recovered.protocol);
      }
    }
    if (!melhorEnvioId) {
      const response = asObject(
        await melhorEnvioRequest("/api/v2/me/cart", {
          method: "POST",
          body: await buildCartPayload(order, settings),
        }),
      );
      melhorEnvioId = optionalString(response?.id);
      protocol = optionalString(response?.protocol);
      if (!melhorEnvioId) {
        throw new ShippingFulfillmentError(
          "O Melhor Envio não retornou o identificador da etiqueta.",
          "INVALID_PROVIDER_RESPONSE",
        );
      }
    }

    await prisma.shipment.update({
      where: { orderId },
      data: {
        melhorEnvioId,
        melhorEnvioProtocol: protocol,
        status: "pending",
        referenciaEtiqueta: melhorEnvioId,
      },
    });

    if (!alreadyPurchased) {
      await melhorEnvioRequest("/api/v2/me/shipment/checkout", {
        method: "POST",
        body: { orders: [melhorEnvioId] },
      });
      const purchased = await prisma.shipment.update({
        where: { orderId },
        data: {
          status: "released",
          labelStatus: "purchased",
          custoEtiqueta: cost,
          compradoEm: new Date(),
          ultimoErro: null,
          ultimoErroCodigo: null,
        },
      });
      await addEvent(
        purchased.id,
        "purchased",
        "purchased",
        "Etiqueta comprada no Melhor Envio.",
        { cost },
      );
    }

    await melhorEnvioRequest("/api/v2/me/shipment/generate", {
      method: "POST",
      body: { orders: [melhorEnvioId] },
    });
    const generated = await prisma.shipment.update({
      where: { orderId },
      data: {
        status: "generated",
        labelStatus: "generated",
        geradoEm: new Date(),
        referenciaEtiqueta: melhorEnvioId,
        processandoEm: null,
        processamentoToken: null,
        ultimoErro: null,
        ultimoErroCodigo: null,
      },
    });
    await addEvent(
      generated.id,
      "generated",
      "generated",
      "Etiqueta gerada com sucesso.",
    );
    const current = await loadOrder(orderId);
    return preparationFromShipment(
      orderId,
      current ? orderShippingMode(current) : preparation.shippingMode,
      current?.shipment ?? null,
      balance,
    );
  } catch (error) {
    await updateFailure(orderId, token, error);
    const current = await loadOrder(orderId);
    return preparationFromShipment(
      orderId,
      current ? orderShippingMode(current) : preparation.shippingMode,
      current?.shipment ?? null,
      await getMelhorEnvioBalance(),
    );
  }
}

export async function attachInvoiceToOrder(
  orderId: string,
  invoiceKeyInput: string,
): Promise<ShipmentPreparation> {
  const invoiceKey = validateNfeKey(invoiceKeyInput);
  const order = await loadOrder(orderId);
  if (!order || order.status !== "pago") {
    throw new ShippingFulfillmentError(
      "A NF-e só pode ser vinculada a um pedido pago.",
      "ORDER_NOT_PAID",
    );
  }
  if (
    order.shipment?.melhorEnvioId &&
    order.shipment.tipoDocumentoFiscal !== "nota_fiscal"
  ) {
    throw new ShippingFulfillmentError(
      "A etiqueta já foi criada com outro tipo de documento fiscal.",
      "FISCAL_DOCUMENT_ALREADY_USED",
    );
  }
  if (
    order.shipment?.chaveNotaFiscal &&
    order.shipment.chaveNotaFiscal !== invoiceKey &&
    order.shipment.melhorEnvioId
  ) {
    throw new ShippingFulfillmentError(
      "A etiqueta já foi criada com outra chave de NF-e.",
      "INVOICE_ALREADY_USED",
    );
  }

  const shipment = await prisma.shipment.upsert({
    where: { orderId },
    create: {
      orderId,
      status: "invoice_attached",
      labelStatus: "awaiting_shipping_data",
      tipoDocumentoFiscal: "nota_fiscal",
      tipoDocumentoFiscalConfirmadoEm: new Date(),
      chaveNotaFiscal: invoiceKey,
    },
    update: {
      tipoDocumentoFiscal: "nota_fiscal",
      tipoDocumentoFiscalConfirmadoEm: new Date(),
      chaveNotaFiscal: invoiceKey,
      ultimoErro: null,
      ultimoErroCodigo: null,
    },
  });
  await addEvent(
    shipment.id,
    "invoice_attached",
    shipment.labelStatus,
    "Chave da NF-e validada e vinculada ao pedido.",
  );

  const preparation = await prepareOrderShipment(orderId);
  if (shouldAutomaticallyPurchase({
    enabled: config.melhorEnvio.autoPurchaseEnabled,
    shippingMode: preparation.shippingMode,
    labelStatus: preparation.labelStatus,
  })) {
    return executeShipmentPurchase(orderId, "automatic");
  }
  return preparation;
}

export async function confirmFiscalDocumentForOrder(
  orderId: string,
  fiscalDocumentType: FiscalDocumentType,
): Promise<ShipmentPreparation> {
  const order = await loadOrder(orderId);
  if (!order || order.status !== "pago") {
    throw new ShippingFulfillmentError(
      "O documento fiscal só pode ser confirmado em um pedido pago.",
      "ORDER_NOT_PAID",
    );
  }
  if (
    order.shipment?.melhorEnvioId &&
    order.shipment.tipoDocumentoFiscal !== fiscalDocumentType
  ) {
    throw new ShippingFulfillmentError(
      "A etiqueta já foi criada com outro tipo de documento fiscal.",
      "FISCAL_DOCUMENT_ALREADY_USED",
    );
  }
  if (
    order.shipment?.tipoDocumentoFiscal === fiscalDocumentType &&
    order.shipment.tipoDocumentoFiscalConfirmadoEm
  ) {
    return prepareOrderShipment(orderId);
  }

  const confirmedAt = new Date();
  const shipment = await prisma.shipment.upsert({
    where: { orderId },
    create: {
      orderId,
      status: "fiscal_document_confirmed",
      labelStatus: "awaiting_shipping_data",
      tipoDocumentoFiscal: fiscalDocumentType,
      tipoDocumentoFiscalConfirmadoEm: confirmedAt,
      chaveNotaFiscal: null,
    },
    update: {
      status: "fiscal_document_confirmed",
      labelStatus: "awaiting_shipping_data",
      tipoDocumentoFiscal: fiscalDocumentType,
      tipoDocumentoFiscalConfirmadoEm: confirmedAt,
      ...(fiscalDocumentType === "declaracao_conteudo"
        ? { chaveNotaFiscal: null }
        : {}),
      ultimoErro: null,
      ultimoErroCodigo: null,
      processandoEm: null,
      processamentoToken: null,
    },
  });
  await addEvent(
    shipment.id,
    "fiscal_document_confirmed",
    shipment.labelStatus,
    fiscalDocumentType === "nota_fiscal"
      ? "NF-e confirmada como documento fiscal deste pedido."
      : "Declaração de conteúdo confirmada para este pedido.",
    { fiscalDocumentType },
  );

  const preparation = await prepareOrderShipment(orderId);
  if (shouldAutomaticallyPurchase({
    enabled: config.melhorEnvio.autoPurchaseEnabled,
    shippingMode: preparation.shippingMode,
    labelStatus: preparation.labelStatus,
  })) {
    return executeShipmentPurchase(orderId, "automatic");
  }
  return preparation;
}

export async function markOrderAsExternalShipment(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shipment: true },
  });
  if (!order || order.status !== "pago") {
    throw new ShippingFulfillmentError(
      "Somente pedidos pagos podem ser marcados como envio externo.",
      "ORDER_NOT_PAID",
    );
  }
  if (order.shipment?.melhorEnvioId) {
    throw new ShippingFulfillmentError(
      "Este pedido já possui uma etiqueta no Melhor Envio.",
      "LABEL_ALREADY_EXISTS",
    );
  }
  await prisma.order.update({
    where: { id: orderId },
    data: {
      shippingMode: "external",
      shippingProvider: "external",
      shippingPayer: "external",
    },
  });
  const shipment = await prisma.shipment.upsert({
    where: { orderId },
    create: {
      orderId,
      status: "external",
      labelStatus: "external",
      labelSource: "external",
    },
    update: {
      status: "external",
      labelStatus: "external",
      labelSource: "external",
      ultimoErro: null,
      ultimoErroCodigo: null,
      processandoEm: null,
      processamentoToken: null,
    },
  });
  await addEvent(
    shipment.id,
    "marked_external",
    "external",
    "Pedido marcado como envio externo.",
  );
}

export async function prepareShipmentAfterPayment(orderId: string) {
  const preparation = await prepareOrderShipment(orderId);
  if (shouldAutomaticallyPurchase({
    enabled: config.melhorEnvio.autoPurchaseEnabled,
    shippingMode: preparation.shippingMode,
    labelStatus: preparation.labelStatus,
  })) {
    return executeShipmentPurchase(orderId, "automatic");
  }
  return preparation;
}

export async function syncShipmentTracking(orderId: string) {
  const shipment = await prisma.shipment.findUnique({ where: { orderId } });
  if (!shipment?.melhorEnvioId) {
    throw new ShippingFulfillmentError(
      "Este pedido ainda não possui etiqueta no Melhor Envio.",
      "LABEL_NOT_FOUND",
    );
  }
  const response = await melhorEnvioRequest(
    "/api/v2/me/shipment/tracking",
    { method: "POST", body: { orders: [shipment.melhorEnvioId] } },
  );
  const data = shipmentResponseObject(response);
  await applyProviderShipmentUpdate({
    melhorEnvioId: shipment.melhorEnvioId,
    orderId,
    protocol: optionalString(data?.protocol),
    status: optionalString(data?.status),
    tracking: optionalString(data?.tracking),
    trackingUrl: optionalString(data?.tracking_url),
  });
}

export async function cancelShipment(orderId: string) {
  const shipment = await prisma.shipment.findUnique({ where: { orderId } });
  if (!shipment?.melhorEnvioId) {
    throw new ShippingFulfillmentError(
      "Este pedido ainda não possui etiqueta no Melhor Envio.",
      "LABEL_NOT_FOUND",
    );
  }
  if (shipment.labelStatus === "canceled") {
    return;
  }
  if (["posted", "in_transit", "delivered"].includes(shipment.labelStatus)) {
    throw new ShippingFulfillmentError(
      "Esta etiqueta não pode mais ser cancelada neste estágio.",
      "LABEL_NOT_CANCELLABLE",
    );
  }
  try {
    const eligibilityResponse = await melhorEnvioRequest(
      "/api/v2/me/shipment/cancellable",
      {
        method: "POST",
        body: { orders: [shipment.melhorEnvioId] },
      },
    );
    if (findCancellationEligibility(eligibilityResponse) === false) {
      throw new ShippingFulfillmentError(
        "O Melhor Envio informou que esta etiqueta não pode mais ser cancelada.",
        "LABEL_NOT_CANCELLABLE",
      );
    }

    await melhorEnvioRequest("/api/v2/me/shipment/cancel", {
      method: "POST",
      body: {
        order: {
          id: shipment.melhorEnvioId,
          reason_id: 2,
          description: "Cancelamento solicitado pelo administrador da EcomZero.",
        },
      },
    });
  } catch (error) {
    if (error instanceof ShippingFulfillmentError) throw error;

    const providerMessage = safeError(error);
    await addEvent(
      shipment.id,
      "cancel_error",
      shipment.labelStatus,
      `Cancelamento não concluído: ${providerMessage}`,
    ).catch(() => undefined);

    if (error instanceof MelhorEnvioServiceError) {
      if (/unauthorized|não autorizad|permiss/i.test(providerMessage)) {
        throw new ShippingFulfillmentError(
          "A integração não possui a permissão shipping-cancel. Reautorize o Melhor Envio em Fretes > Reautorizar permissões e tente novamente.",
          "MISSING_CANCEL_PERMISSION",
        );
      }
      throw new ShippingFulfillmentError(
        `O Melhor Envio recusou o cancelamento: ${providerMessage}`,
        "LABEL_NOT_CANCELLABLE",
      );
    }
    throw error;
  }

  await applyProviderShipmentUpdate({
    melhorEnvioId: shipment.melhorEnvioId,
    orderId,
    status: "cancelled",
    canceledAt: new Date(),
  });
}
