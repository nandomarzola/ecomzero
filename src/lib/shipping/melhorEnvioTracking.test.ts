import assert from "node:assert/strict";
import test from "node:test";
import { findMelhorEnvioTrackingPayload } from "./melhorEnvioTracking";

test("encontra rastreio retornado diretamente pelo Melhor Envio", () => {
  const payload = findMelhorEnvioTrackingPayload(
    { id: "shipment-1", status: "delivered", tracking: "BR123" },
    "shipment-1",
  );

  assert.equal(payload?.status, "delivered");
  assert.equal(payload?.tracking, "BR123");
});

test("encontra rastreio quando a resposta vem em array", () => {
  const payload = findMelhorEnvioTrackingPayload(
    [
      { id: "shipment-1", status: "posted" },
      { id: "shipment-2", status: "delivered" },
    ],
    "shipment-2",
  );

  assert.equal(payload?.id, "shipment-2");
  assert.equal(payload?.status, "delivered");
});

test("encontra rastreio quando a resposta vem indexada pelo id", () => {
  const payload = findMelhorEnvioTrackingPayload(
    {
      "shipment-1": {
        protocol: "ORD-1",
        status: "delivered",
        delivered_at: "2026-07-27T14:00:00Z",
      },
    },
    "shipment-1",
  );

  assert.equal(payload?.status, "delivered");
  assert.equal(payload?.protocol, "ORD-1");
});

test("não usa o rastreio de outra etiqueta", () => {
  const payload = findMelhorEnvioTrackingPayload(
    [{ id: "shipment-2", status: "delivered" }],
    "shipment-1",
  );

  assert.equal(payload, null);
});
