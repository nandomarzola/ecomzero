import assert from "node:assert/strict";
import test from "node:test";
import { orderCancellationSchema } from "@/lib/validation/orderCancellation";

const requestedBy = "admin@ecomzero.com.br";

test("aceita motivo conhecido e administrador válido", () => {
  const parsed = orderCancellationSchema.safeParse({
    reason: "customer_request",
    requestedBy,
  });
  assert.equal(parsed.success, true);
});

test("exige observação ao selecionar outro motivo", () => {
  const withoutNote = orderCancellationSchema.safeParse({
    reason: "other",
    requestedBy,
  });
  const withNote = orderCancellationSchema.safeParse({
    reason: "other",
    note: "Solicitação registrada no atendimento.",
    requestedBy,
  });
  assert.equal(withoutNote.success, false);
  assert.equal(withNote.success, true);
});

test("rejeita ator inválido e observação acima do limite", () => {
  const parsed = orderCancellationSchema.safeParse({
    reason: "suspected_fraud",
    note: "x".repeat(501),
    requestedBy: "sem-email",
  });
  assert.equal(parsed.success, false);
});
