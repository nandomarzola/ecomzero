import assert from "node:assert/strict";
import test from "node:test";
import type { Payment as MercadoPagoPayment } from "mercadopago";
import type {
  PaymentOrderSnapshot,
} from "@/lib/services/mercadoPagoService";
import type { BrickPaymentInput } from "@/lib/validation/payment";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/ecomzero_test";
process.env.AUTH_SECRET ??= "test-secret-with-at-least-32-characters";
process.env.MERCADOPAGO_ACCESS_TOKEN ??= "TEST-access-token";

const order: PaymentOrderSnapshot = {
  id: "baff6757-3d68-4d28-88c5-a97486cb9464",
  total: 20.87,
  descontoCupom: 0,
  nomeCliente: "Cliente Teste",
  emailCliente: "cliente@example.com",
  telefoneCliente: "11999999999",
  cpfCnpj: "19119119100",
  cepDestino: "06233-903",
  logradouro: "Av das Nacoes Unidas",
  numero: "3003",
  complemento: "Apto 5",
  bairro: "Bonfim",
  cidade: "Osasco",
  uf: "SP",
  valorFrete: 5,
  items: [
    {
      id: "produto-1",
      variantId: "variante-1",
      productName: "Produto de teste",
      productImage: "/produto.jpg",
      variantLabel: "Padrão",
      quantidade: 1,
      precoUnitario: 15.87,
    },
  ],
};

const cardInput: BrickPaymentInput = {
  attemptId: "992e9ca9-6317-4d47-a7a7-b5649c38db7e",
  formData: {
    payment_method_id: "visa",
    token: "card-token-with-enough-characters",
    issuer_id: "12510",
    installments: 1,
  },
};

const pixInput: BrickPaymentInput = {
  attemptId: "7b3ae5b9-f6be-4dcb-b5dc-5fd6ff6e1136",
  formData: {
    payment_method_id: "pix",
  },
};

type CreatePayment = MercadoPagoPayment["create"];
type CreatePaymentData = Parameters<CreatePayment>[0];

test("payload de cartão usa somente campos de entrega aceitos por POST /v1/payments", async () => {
  const [{ Payment }, { createMercadoPagoPayment }] = await Promise.all([
    import("mercadopago"),
    import("@/lib/services/mercadoPagoService"),
  ]);
  const originalCreate = Payment.prototype.create;
  const captured: CreatePaymentData[] = [];

  Payment.prototype.create = (async (data) => {
    captured.push(data);
    return {
      id: captured.length,
      status: "pending",
      transaction_amount: order.total,
      external_reference: order.id,
    } as Awaited<ReturnType<CreatePayment>>;
  }) as CreatePayment;

  try {
    await createMercadoPagoPayment(order, cardInput, "https://www.ecomzero.com.br");
    await createMercadoPagoPayment(order, pixInput, "https://www.ecomzero.com.br");
  } finally {
    Payment.prototype.create = originalCreate;
  }

  const cardShipments = captured[0]?.body.additional_info?.shipments;
  assert.ok(cardShipments);
  assert.deepEqual(cardShipments, {
    receiver_address: {
      zip_code: "06233903",
      street_name: "Av das Nacoes Unidas",
      street_number: "3003",
      apartment: "Apto 5",
      city_name: "Osasco",
      state_name: "SP",
    },
  });
  assert.equal("mode" in cardShipments, false);
  assert.equal("cost" in cardShipments, false);
  assert.ok(cardShipments.receiver_address);
  assert.equal("country_name" in cardShipments.receiver_address, false);

  const pixAdditionalInfo = captured[1]?.body.additional_info;
  assert.ok(pixAdditionalInfo);
  assert.equal("shipments" in pixAdditionalInfo, false);
  assert.equal(pixAdditionalInfo.items?.length, 2);
});
