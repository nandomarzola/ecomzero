import assert from "node:assert/strict";
import test from "node:test";
import {
  paymentPageErrorRedirect,
  paymentPageStatusRedirect,
} from "@/lib/paymentPageNavigation";

test("pagamento removido ou cancelado nunca cai em 404 genérico", () => {
  assert.equal(
    paymentPageErrorRedirect("ORDER_NOT_FOUND"),
    "/carrinho?pagamento=encerrado",
  );
  assert.equal(
    paymentPageStatusRedirect("order-1", "cancelado"),
    "/carrinho?pagamento=cancelado",
  );
});

test("pagamento aprovado continua indo para o sucesso", () => {
  assert.equal(
    paymentPageStatusRedirect("order-1", "pago"),
    "/pedido/order-1/sucesso",
  );
  assert.equal(
    paymentPageStatusRedirect("order-1", "aguardando_pagamento"),
    null,
  );
});
