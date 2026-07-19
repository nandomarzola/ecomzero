import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_LOGIN_RESEND_COOLDOWN_SECONDS,
  adminLoginCodeMatches,
  generateAdminLoginCode,
  generateAdminLoginToken,
  hashAdminLoginCode,
  hashAdminLoginToken,
  maskAdminEmail,
  resendCooldownSeconds,
} from "./security/adminLoginChallenge";

const secret = "test-secret-with-at-least-thirty-two-characters";

test("gera OTP de seis dígitos e token opaco", () => {
  assert.match(generateAdminLoginCode(), /^\d{6}$/);
  assert.match(generateAdminLoginToken(), /^[A-Za-z0-9_-]{40,}$/);
});

test("persiste token e código somente como HMAC", () => {
  const token = "opaque-challenge-token";
  const code = "042931";
  assert.notEqual(hashAdminLoginToken(token, secret), token);
  const codeHash = hashAdminLoginCode(code, secret);
  assert.equal(codeHash.includes(code), false);
  assert.equal(adminLoginCodeMatches(code, codeHash, secret), true);
  assert.equal(adminLoginCodeMatches("042932", codeHash, secret), false);
  assert.equal(adminLoginCodeMatches("123", codeHash, secret), false);
});

test("mascara o e-mail sem esconder o domínio", () => {
  assert.equal(maskAdminEmail("nando@ecomzero.com.br"), "n****@ecomzero.com.br");
  assert.equal(maskAdminEmail("a@ecomzero.com.br"), "a**@ecomzero.com.br");
});

test("cooldown de reenvio nunca fica negativo", () => {
  const sentAt = new Date("2026-07-19T12:00:00.000Z");
  assert.equal(
    resendCooldownSeconds(sentAt, new Date("2026-07-19T12:00:00.000Z")),
    ADMIN_LOGIN_RESEND_COOLDOWN_SECONDS,
  );
  assert.equal(
    resendCooldownSeconds(sentAt, new Date("2026-07-19T12:00:45.000Z")),
    15,
  );
  assert.equal(
    resendCooldownSeconds(sentAt, new Date("2026-07-19T12:02:00.000Z")),
    0,
  );
});
