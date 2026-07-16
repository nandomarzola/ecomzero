import assert from "node:assert/strict";
import test from "node:test";
import {
  canAdvanceShippingStatus,
  isValidNfeKey,
  shouldAutomaticallyPurchase,
} from "@/lib/shipping/shippingDomain";

function validKey(body: string) {
  let weight = 2;
  let sum = 0;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  const digit = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
  return `${body}${digit}`;
}

test("valida chave de NF-e com 44 dígitos e dígito verificador", () => {
  const key = validKey("3526071234567800019055001000000001100000001");
  assert.equal(key.length, 44);
  assert.equal(isValidNfeKey(key), true);
  assert.equal(isValidNfeKey(`${key.slice(0, 43)}${Number(key[43]) === 9 ? 0 : Number(key[43]) + 1}`), false);
  assert.equal(isValidNfeKey("123"), false);
});

test("não permite regressão logística nem cancelamento após entrega", () => {
  assert.equal(canAdvanceShippingStatus("generated", "in_transit"), true);
  assert.equal(canAdvanceShippingStatus("in_transit", "generated"), false);
  assert.equal(canAdvanceShippingStatus("delivered", "canceled"), false);
});

test("compra automática exige flag, frete contratado e pedido pronto", () => {
  assert.equal(shouldAutomaticallyPurchase({ enabled: false, shippingMode: "melhor_envio", labelStatus: "ready_to_purchase" }), false);
  assert.equal(shouldAutomaticallyPurchase({ enabled: true, shippingMode: "free_shipping_coupon", labelStatus: "ready_to_purchase" }), false);
  assert.equal(shouldAutomaticallyPurchase({ enabled: true, shippingMode: "melhor_envio", labelStatus: "awaiting_invoice" }), false);
  assert.equal(shouldAutomaticallyPurchase({ enabled: true, shippingMode: "melhor_envio", labelStatus: "ready_to_purchase" }), true);
});
