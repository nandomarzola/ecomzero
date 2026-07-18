import assert from "node:assert/strict";
import test from "node:test";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenUsable,
} from "./passwordReset";

test("gera token opaco e persiste apenas um hash determinístico", () => {
  const firstToken = createPasswordResetToken();
  const secondToken = createPasswordResetToken();
  const firstHash = hashPasswordResetToken(firstToken);

  assert.match(firstToken, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(firstToken, secondToken);
  assert.match(firstHash, /^[a-f0-9]{64}$/);
  assert.notEqual(firstHash, firstToken);
  assert.equal(hashPasswordResetToken(firstToken), firstHash);
});

test("aceita somente token não usado e ainda não expirado", () => {
  const now = new Date("2026-07-18T12:00:00.000Z");

  assert.equal(
    isPasswordResetTokenUsable(
      { expiresAt: new Date(now.getTime() + 1), usedAt: null },
      now,
    ),
    true,
  );
  assert.equal(
    isPasswordResetTokenUsable({ expiresAt: now, usedAt: null }, now),
    false,
  );
  assert.equal(
    isPasswordResetTokenUsable(
      { expiresAt: new Date(now.getTime() + 1), usedAt: now },
      now,
    ),
    false,
  );
});
