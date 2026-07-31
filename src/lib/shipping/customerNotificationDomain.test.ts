import assert from "node:assert/strict";
import test from "node:test";
import {
  customerNotificationContent,
  notificationTypeFromShipmentEvent,
  orderCancellationEmailContent,
  shouldNotifyOrderCancellation,
} from "./customerNotificationDomain";
import { renderCustomerMessage } from "../storeSettingsDomain";

test("mapeia os eventos relevantes do ciclo do pedido", () => {
  assert.equal(
    notificationTypeFromShipmentEvent("payment_confirmed", null),
    "payment_confirmed",
  );
  assert.equal(
    notificationTypeFromShipmentEvent("generated", "generated"),
    "order_preparing",
  );
  assert.equal(
    notificationTypeFromShipmentEvent("prepared", "awaiting_fiscal_document"),
    "order_preparing",
  );
  assert.equal(
    notificationTypeFromShipmentEvent("provider_status", "in_transit"),
    "order_in_transit",
  );
  assert.equal(
    notificationTypeFromShipmentEvent("provider_status", "delivered"),
    "order_delivered",
  );
  assert.equal(
    notificationTypeFromShipmentEvent("preparation_error", "error"),
    null,
  );
});

test("gera a mensagem de entrega com a referência curta do pedido", () => {
  assert.deepEqual(
    customerNotificationContent(
      "order_delivered",
      "03730a23-aaaa-bbbb-cccc-dddddddddddd",
    ),
    {
      title: "Pedido entregue",
      message: "Seu pedido #03730a23 foi entregue!",
    },
  );
});

test("gera a notificação aprovada de cancelamento", () => {
  assert.deepEqual(
    customerNotificationContent(
      "order_canceled",
      "03730a23-aaaa-bbbb-cccc-dddddddddddd",
    ),
    {
      title: "Pedido cancelado",
      message:
        "Seu pedido #03730a23 foi cancelado e o estorno já foi iniciado. O valor retorna pela mesma forma de pagamento.",
    },
  );
});

test("notifica cancelamento somente após estorno efetivo", () => {
  assert.equal(shouldNotifyOrderCancellation(null), false);
  assert.equal(shouldNotifyOrderCancellation("cancelled"), false);
  assert.equal(shouldNotifyOrderCancellation("approved"), true);
  assert.equal(shouldNotifyOrderCancellation("processed"), true);
  assert.equal(shouldNotifyOrderCancellation("refunded"), true);
});

test("diferencia o prazo do estorno por meio de pagamento real", () => {
  const base = {
    orderId: "03730a23-aaaa-bbbb-cccc-dddddddddddd",
    customerName: "Maria",
    total: 20.87,
  };
  const pix = orderCancellationEmailContent({
    ...base,
    payment: { paymentMethodId: "pix", paymentTypeId: "bank_transfer" },
  });
  const card = orderCancellationEmailContent({
    ...base,
    payment: { paymentMethodId: "visa", paymentTypeId: "credit_card" },
  });
  const generic = orderCancellationEmailContent({
    ...base,
    payment: { paymentMethodId: null, paymentTypeId: null },
  });

  assert.equal(
    pix.subject,
    "Seu pedido #03730a23 foi cancelado — estorno em andamento",
  );
  assert.match(pix.message, /reembolso de R\$ 20,87 já foi processado/);
  assert.match(pix.message, /pagamentos via Pix/);
  assert.match(card.message, /1 a 2 faturas/);
  assert.match(generic.message, /o prazo varia conforme o método usado/);
});

test("substitui as variáveis reais dos templates transacionais", () => {
  assert.equal(
    renderCustomerMessage(
      "Olá, {nome_cliente}. Pedido {numero_pedido} confirmado.",
      {
        customerName: "Maria da Silva",
        orderId: "03730a23-aaaa-bbbb-cccc-dddddddddddd",
      },
    ),
    "Olá, Maria da Silva. Pedido #03730a23 confirmado.",
  );
  assert.equal(
    renderCustomerMessage("Boas-vindas, {nome_cliente}!", {
      customerName: "Maria da Silva",
    }),
    "Boas-vindas, Maria da Silva!",
  );
});
