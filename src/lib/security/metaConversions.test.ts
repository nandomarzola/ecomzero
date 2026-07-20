import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMetaPurchaseServerEvent,
  hashMetaUserData,
  normalizeMetaEmail,
  normalizeMetaPhone,
} from "@/lib/metaConversionsDomain";

test("normaliza e hasheia os identificadores do cliente para a CAPI", () => {
  const email = normalizeMetaEmail("  Nando@EcomZero.COM.BR ");
  const phone = normalizeMetaPhone("(14) 99835-5880");

  assert.equal(email, "nando@ecomzero.com.br");
  assert.equal(phone, "5514998355880");
  assert.equal(
    hashMetaUserData(email),
    "8dbac6c43ea8bd29a7e6a682759f0ff686834cfe437f24bb762676faa9d8c3dc",
  );
  assert.equal(
    hashMetaUserData(phone),
    "da465e7c8c06bc0556efa3c6122e546822fc3c19bc38d8c8e7f873169e763646",
  );
});

test("gera Purchase CAPI com o mesmo event_id e UUIDs de variante do Pixel e feed", () => {
  const event = buildMetaPurchaseServerEvent({
    orderId: "order-123",
    eventTime: new Date("2026-07-20T15:00:00.000Z"),
    total: 79.899,
    email: " Cliente@Example.com ",
    phone: "+55 (14) 99835-5880",
    items: [
      { variantId: " variant-uuid-1 ", quantity: 2, unitPrice: 31.99 },
      { variantId: "variant-uuid-2", quantity: 1, unitPrice: 15.9 },
    ],
  });

  assert.equal(event.event_name, "Purchase");
  assert.equal(event.event_id, "purchase_order-123");
  assert.equal(event.event_time, 1784559600);
  assert.equal(event.action_source, "website");
  assert.equal(event.custom_data.currency, "BRL");
  assert.equal(event.custom_data.value, 79.9);
  assert.equal(event.custom_data.content_type, "product");
  assert.deepEqual(event.custom_data.content_ids, ["variant-uuid-1", "variant-uuid-2"]);
  assert.deepEqual(event.custom_data.contents, [
    { id: "variant-uuid-1", quantity: 2, item_price: 31.99 },
    { id: "variant-uuid-2", quantity: 1, item_price: 15.9 },
  ]);
  assert.deepEqual(event.user_data.em, [hashMetaUserData("cliente@example.com")]);
  assert.deepEqual(event.user_data.ph, [hashMetaUserData("5514998355880")]);
  assert.doesNotMatch(JSON.stringify(event), /cliente@example\.com|99835-5880/i);
});
