import assert from "node:assert/strict";
import test from "node:test";
import { generateTemporaryPassword } from "@/lib/security/temporaryPassword";

test("gera senha temporária criptográfica, forte e não repetida", () => {
  const passwords = new Set(
    Array.from({ length: 100 }, () => generateTemporaryPassword()),
  );

  assert.equal(passwords.size, 100);
  for (const password of passwords) {
    assert.match(password, /^Ez![A-Za-z0-9_-]{16}$/);
    assert.ok(password.length >= 16);
  }
});
