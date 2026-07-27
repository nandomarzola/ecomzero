import assert from "node:assert/strict";
import test from "node:test";
import { orderPeriodScope } from "@/lib/orders/filters";

test("filas logísticas abertas não são limitadas pela data do pedido", () => {
  assert.equal(orderPeriodScope("aguardando-etiqueta"), "active-queue");
  assert.equal(orderPeriodScope("etiqueta-gerada"), "active-queue");
  assert.equal(orderPeriodScope("com-problema"), "active-queue");
  assert.equal(orderPeriodScope("postados"), "active-queue");
  assert.equal(orderPeriodScope("em-transito"), "active-queue");
});

test("entregues usam atividade logística e demais filtros usam criação", () => {
  assert.equal(orderPeriodScope("entregues"), "delivery-activity");
  assert.equal(orderPeriodScope("todos"), "order-created");
  assert.equal(orderPeriodScope("aguardando-pagamento"), "order-created");
  assert.equal(orderPeriodScope("frete-gratis"), "order-created");
});
