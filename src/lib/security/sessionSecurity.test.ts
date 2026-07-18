import assert from "node:assert/strict";
import test from "node:test";
import {
  getSessionIssuedAt,
  isSessionValidForCutoff,
} from "./sessionSecurity";

test("preserva o instante original da sessão no JWT", () => {
  assert.equal(getSessionIssuedAt({ sessionIssuedAt: 1_750_000_000_123, iat: 1 }), 1_750_000_000_123);
  assert.equal(getSessionIssuedAt({ iat: 1_750_000_000 }), 1_750_000_000_000);
  assert.equal(getSessionIssuedAt({}), null);
});

test("invalida sessões emitidas antes do corte de segurança", () => {
  const cutoff = new Date("2026-07-18T12:00:00.000Z");

  assert.equal(isSessionValidForCutoff(cutoff.getTime() - 1, cutoff), false);
  assert.equal(isSessionValidForCutoff(cutoff.getTime(), cutoff), true);
  assert.equal(isSessionValidForCutoff(cutoff.getTime() + 1, cutoff), true);
  assert.equal(isSessionValidForCutoff(1, null), true);
});
