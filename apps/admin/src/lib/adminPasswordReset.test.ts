import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_PASSWORD_RESET_TTL_MS,
  createAdminPasswordResetToken,
  getAdminPasswordResetSubject,
  verifyAdminPasswordResetToken,
} from "./security/adminPasswordReset";
import {
  adminPasswordResetConfirmSchema,
  adminPasswordResetRequestSchema,
} from "./validation/adminPasswordReset";

const adminUserId = "48735373-f068-4166-b122-abb0ea97ef68";
const passwordHash = "$2b$12$hash-atual-do-admin";
const secret = "segredo-de-teste-com-pelo-menos-trinta-e-dois-caracteres";
const now = new Date("2026-07-21T12:00:00.000Z");

test("token de recuperação do admin expira e fica vinculado à senha atual", () => {
  const { token, expiresAt } = createAdminPasswordResetToken({
    adminUserId,
    passwordHash,
    secret,
    now,
  });

  assert.equal(expiresAt.getTime(), now.getTime() + ADMIN_PASSWORD_RESET_TTL_MS);
  assert.equal(getAdminPasswordResetSubject(token, now), adminUserId);
  assert.equal(
    verifyAdminPasswordResetToken({
      token,
      adminUserId,
      passwordHash,
      secret,
      now,
    }),
    true,
  );
  assert.equal(
    verifyAdminPasswordResetToken({
      token,
      adminUserId,
      passwordHash: "$2b$12$senha-ja-alterada",
      secret,
      now,
    }),
    false,
  );
  assert.equal(
    getAdminPasswordResetSubject(
      token,
      new Date(now.getTime() + ADMIN_PASSWORD_RESET_TTL_MS + 1),
    ),
    null,
  );
});

test("token adulterado não é aceito", () => {
  const { token } = createAdminPasswordResetToken({
    adminUserId,
    passwordHash,
    secret,
    now,
  });
  const [payload, signature] = token.split(".");
  const replacement = signature?.startsWith("A") ? "B" : "A";
  const tampered = `${payload}.${replacement}${signature?.slice(1)}`;

  assert.equal(
    verifyAdminPasswordResetToken({
      token: tampered,
      adminUserId,
      passwordHash,
      secret,
      now,
    }),
    false,
  );
});

test("valida e-mail e requisitos da nova senha", () => {
  assert.equal(
    adminPasswordResetRequestSchema.safeParse({ email: "admin@ecomzero.com.br" }).success,
    true,
  );
  assert.equal(
    adminPasswordResetConfirmSchema.safeParse({
      token: "a".repeat(80),
      newPassword: "NovaSenha123",
    }).success,
    true,
  );
  assert.equal(
    adminPasswordResetConfirmSchema.safeParse({
      token: "a".repeat(80),
      newPassword: "senha-fraca",
    }).success,
    false,
  );
});
