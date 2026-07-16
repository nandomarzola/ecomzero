import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import {
  melhorEnvioFileRequest,
  melhorEnvioRequest,
} from "@/lib/services/melhorEnvioAdminService";
import type {
  CreateShipmentInput,
  ShippingSettingsInput,
} from "@/lib/validation/shipping";

type ShippingOption = {
  id: string;
  transportadora: string;
  servico: string;
  preco: number;
  prazoDias: number;
};

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function shipmentResponseObject(value: unknown): JsonObject | null {
  const object = asObject(value);
  if (!object) return null;
  if (
    "status" in object ||
    "tracking" in object ||
    "tracking_url" in object ||
    "protocol" in object
  ) {
    return object;
  }
  for (const nested of Object.values(object)) {
    const found = shipmentResponseObject(nested);
    if (found) return found;
  }
  return null;
}

async function recordShipmentError(orderId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Falha na operação logística.";
  await prisma.shipment.updateMany({
    where: { orderId },
    data: { ultimoErro: message.slice(0, 500) },
  });
}

export async function getShippingSettings() {
  return prisma.shippingSettings.findUnique({ where: { id: "singleton" } });
}

export async function updateShippingSettings(input: ShippingSettingsInput) {
  const data = {
    ...input,
    inscricaoEstadual: input.inscricaoEstadual ?? null,
    atividadeEconomica: input.atividadeEconomica ?? null,
    complementoOrigem: input.complementoOrigem ?? null,
  };
  return prisma.shippingSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });
}

export async function getAdminOrderDetails(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      shipment: true,
      items: {
        include: {
          variant: { include: { product: true } },
        },
      },
    },
  });
}

export async function createMelhorEnvioShipment(
  orderId: string,
  input: CreateShipmentInput,
) {
  const [order, settings] = await Promise.all([
    getAdminOrderDetails(orderId),
    getShippingSettings(),
  ]);

  if (!order || order.status === "draft") throw new Error("Pedido não encontrado.");
  if (order.status !== "pago") throw new Error("A etiqueta só pode ser criada após a confirmação do pagamento.");
  if (!settings) throw new Error("Cadastre os dados do remetente na página Fretes antes de continuar.");
  if (order.shipment?.melhorEnvioId) return order.shipment;
  if (
    !order.shippingQuoteId ||
    !order.shippingOptionId ||
    !order.nomeCliente ||
    !order.emailCliente ||
    !order.telefoneCliente ||
    !order.cpfCnpj ||
    !order.cepDestino ||
    !order.logradouro ||
    !order.numero ||
    !order.bairro ||
    !order.cidade ||
    !order.uf
  ) {
    throw new Error("O pedido não possui todos os dados necessários para criar o envio.");
  }

  const senderDocument = settings.cpfCnpjRemetente.replace(/\D/g, "");
  const recipientDocument = order.cpfCnpj.replace(/\D/g, "");
  if (input.tipoDocumentoFiscal === "nota_fiscal") {
    if (senderDocument.length !== 14) {
      throw new Error("Envio comercial com NF-e exige CNPJ nos dados do remetente.");
    }
    if (!settings.inscricaoEstadual) {
      throw new Error("Informe a inscrição estadual do remetente para usar NF-e.");
    }
  }

  const quote = await prisma.checkoutShippingQuote.findUnique({
    where: { id: order.shippingQuoteId },
  });
  const options = Array.isArray(quote?.options)
    ? (quote.options as unknown as ShippingOption[])
    : [];
  const selectedOption = options.find(
    (option) => String(option.id) === order.shippingOptionId,
  );
  if (!selectedOption) {
    throw new Error("Não foi possível recuperar o serviço de frete escolhido neste pedido.");
  }

  await prisma.shipment.upsert({
    where: { orderId },
    create: {
      orderId,
      status: "creating",
      transportadora: selectedOption.transportadora,
      servico: selectedOption.servico,
      tipoDocumentoFiscal: input.tipoDocumentoFiscal,
      chaveNotaFiscal:
        input.tipoDocumentoFiscal === "nota_fiscal" ? input.chaveNotaFiscal : null,
    },
    update: {
      status: "creating",
      ultimoErro: null,
      transportadora: selectedOption.transportadora,
      servico: selectedOption.servico,
      tipoDocumentoFiscal: input.tipoDocumentoFiscal,
      chaveNotaFiscal:
        input.tipoDocumentoFiscal === "nota_fiscal" ? input.chaveNotaFiscal : null,
    },
  });

  const products = order.items.map((item) => ({
    name: item.variant.product.nome.slice(0, 100),
    quantity: item.quantidade,
    unitary_value: Number(item.precoUnitario),
  }));
  const payload: JsonObject = {
    service: Number(order.shippingOptionId),
    from: {
      name: settings.nomeRemetente,
      email: settings.emailRemetente,
      phone: settings.telefoneRemetente,
      ...(senderDocument.length === 14
        ? {
            company_document: senderDocument,
            state_register:
              input.tipoDocumentoFiscal === "nota_fiscal"
                ? settings.inscricaoEstadual
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
      postal_code: settings.cepOrigem,
      state_abbr: settings.ufOrigem,
    },
    to: {
      name: order.nomeCliente,
      email: order.emailCliente,
      phone: order.telefoneCliente.replace(/\D/g, ""),
      ...(recipientDocument.length === 14
        ? { company_document: recipientDocument }
        : { document: recipientDocument }),
      address: order.logradouro,
      complement: order.complemento ?? "",
      number: order.numero,
      district: order.bairro,
      city: order.cidade,
      postal_code: order.cepDestino.replace(/\D/g, ""),
      country_id: "BR",
      state_abbr: order.uf,
    },
    products,
    volumes: [
      {
        height: Math.max(...order.items.map((item) => item.variant.alturaCm)),
        width: Math.max(...order.items.map((item) => item.variant.larguraCm)),
        length: Math.max(...order.items.map((item) => item.variant.comprimentoCm)),
        weight:
          Math.round(
            order.items.reduce(
              (total, item) => total + item.variant.pesoKg * item.quantidade,
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
      ...(input.tipoDocumentoFiscal === "nota_fiscal"
        ? { invoice: { key: input.chaveNotaFiscal } }
        : {}),
      tags: [
        {
          tag: order.id,
          url: config.storefrontUrl
            ? `${config.storefrontUrl.replace(/\/$/, "")}/conta/pedidos/${order.id}`
            : null,
        },
      ],
    },
  };

  try {
    const response = await melhorEnvioRequest("/api/v2/me/cart", {
      method: "POST",
      body: payload,
    });
    const data = asObject(response);
    const melhorEnvioId = optionalString(data?.id);
    if (!melhorEnvioId) throw new Error("O Melhor Envio não retornou o identificador da etiqueta.");

    return prisma.shipment.update({
      where: { orderId },
      data: {
        melhorEnvioId,
        melhorEnvioProtocol: optionalString(data?.protocol),
        status: "pending",
        ultimoErro: null,
      },
    });
  } catch (error) {
    await recordShipmentError(orderId, error);
    throw error;
  }
}

async function getShipmentForOperation(orderId: string) {
  const shipment = await prisma.shipment.findUnique({ where: { orderId } });
  if (!shipment?.melhorEnvioId) {
    throw new Error("Envie o pedido ao carrinho do Melhor Envio primeiro.");
  }
  return shipment;
}

export async function getMelhorEnvioLabelFile(
  orderId: string,
): Promise<Response> {
  const shipment = await getShipmentForOperation(orderId);
  return melhorEnvioFileRequest(
    `/api/v2/me/imprimir/jpeg/${shipment.melhorEnvioId}`,
  );
}

export async function purchaseMelhorEnvioShipment(orderId: string) {
  const shipment = await getShipmentForOperation(orderId);
  try {
    await melhorEnvioRequest("/api/v2/me/shipment/checkout", {
      method: "POST",
      body: { orders: [shipment.melhorEnvioId] },
    });
    return prisma.shipment.update({
      where: { orderId },
      data: { status: "released", compradoEm: new Date(), ultimoErro: null },
    });
  } catch (error) {
    await recordShipmentError(orderId, error);
    throw error;
  }
}

export async function generateMelhorEnvioLabel(orderId: string) {
  const shipment = await getShipmentForOperation(orderId);
  try {
    await melhorEnvioRequest("/api/v2/me/shipment/generate", {
      method: "POST",
      body: { orders: [shipment.melhorEnvioId] },
    });
    return prisma.shipment.update({
      where: { orderId },
      data: { status: "generated", geradoEm: new Date(), ultimoErro: null },
    });
  } catch (error) {
    await recordShipmentError(orderId, error);
    throw error;
  }
}

// Silencia o aviso da última falha (Shipment.ultimoErro) sem consultar o Melhor
// Envio — para quando o usuário só quer descartar a nota, sem forçar um sync.
export async function dismissShipmentError(orderId: string) {
  const result = await prisma.shipment.updateMany({
    where: { orderId },
    data: { ultimoErro: null },
  });
  if (result.count === 0) {
    throw new Error("Envio não encontrado para este pedido.");
  }
}

export async function syncMelhorEnvioTracking(orderId: string) {
  const shipment = await getShipmentForOperation(orderId);
  try {
    const response = await melhorEnvioRequest("/api/v2/me/shipment/tracking", {
      method: "POST",
      body: { orders: [shipment.melhorEnvioId] },
    });
    const data = shipmentResponseObject(response);
    const status = optionalString(data?.status);
    const tracking = optionalString(data?.tracking);
    const trackingUrl = optionalString(data?.tracking_url);
    return prisma.shipment.update({
      where: { orderId },
      data: {
        ...(status ? { status } : {}),
        ...(tracking ? { codigoRastreio: tracking } : {}),
        ...(trackingUrl ? { urlRastreio: trackingUrl } : {}),
        ultimoErro: null,
      },
    });
  } catch (error) {
    await recordShipmentError(orderId, error);
    throw error;
  }
}
