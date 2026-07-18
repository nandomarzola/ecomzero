import assert from "node:assert/strict";
import test from "node:test";
import {
  customerNotificationContent,
  notificationTypeFromShipmentEvent,
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
