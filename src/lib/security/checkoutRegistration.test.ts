import assert from "node:assert/strict";
import test from "node:test";
import type { CheckoutRegistrationDependencies } from "@/lib/services/authService";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/test";
process.env.AUTH_SECRET ??= "checkout-registration-test-secret-32-chars";

const input = {
  nome: "Cliente Teste",
  email: "CLIENTE@EXAMPLE.COM",
  telefone: "14999999999",
};

test("cadastro do checkout persiste só o hash e entrega a senha antes de liberar a sessão", async () => {
  const { registerCheckoutUser } = await import("@/lib/services/authService");
  let createdPasswordHash = "";
  let deliveredPassword = "";
  const dependencies: CheckoutRegistrationDependencies = {
    findExistingUser: async () => false,
    hashTemporaryPassword: async (password) => {
      assert.equal(password, "Ez!senha-criptografica");
      return "hash-bcrypt";
    },
    createUser: async (data) => {
      createdPasswordHash = data.senhaHash;
      assert.equal(data.email, "cliente@example.com");
      assert.equal(data.mustChangePassword, true);
      return {
        id: "user-1",
        name: data.name,
        email: data.email,
      };
    },
    deliverTemporaryPassword: async (delivery) => {
      deliveredPassword = delivery.temporaryPassword;
      return { status: "sent", providerMessageId: "resend-1" };
    },
    sendWelcome: async () => undefined,
    rollbackUser: async () => assert.fail("não deveria reverter"),
    generateTemporaryPassword: () => "Ez!senha-criptografica",
  };

  const result = await registerCheckoutUser(input, dependencies);

  assert.equal(createdPasswordHash, "hash-bcrypt");
  assert.equal(deliveredPassword, "Ez!senha-criptografica");
  assert.equal(result.temporaryPassword, deliveredPassword);
});

test("falha do e-mail reverte o usuário e impede o login automático", async () => {
  const { AuthServiceError, registerCheckoutUser } = await import(
    "@/lib/services/authService"
  );
  let rolledBackUserId = "";
  const dependencies: CheckoutRegistrationDependencies = {
    findExistingUser: async () => false,
    hashTemporaryPassword: async () => "hash-bcrypt",
    createUser: async (data) => ({
      id: "user-2",
      name: data.name,
      email: data.email,
    }),
    deliverTemporaryPassword: async () => ({
      status: "failed",
      reason: "resend_http_503",
    }),
    sendWelcome: async () => assert.fail("não deveria enviar boas-vindas"),
    rollbackUser: async (userId) => {
      rolledBackUserId = userId;
    },
    generateTemporaryPassword: () => "Ez!senha-criptografica",
  };

  await assert.rejects(
    registerCheckoutUser(input, dependencies),
    (error: unknown) =>
      error instanceof AuthServiceError &&
      error.code === "EMAIL_DELIVERY_FAILED",
  );
  assert.equal(rolledBackUserId, "user-2");
});

test("exceção inesperada do provider também reverte o cadastro", async () => {
  const { AuthServiceError, registerCheckoutUser } = await import(
    "@/lib/services/authService"
  );
  let rolledBackUserId = "";
  const dependencies: CheckoutRegistrationDependencies = {
    findExistingUser: async () => false,
    hashTemporaryPassword: async () => "hash-bcrypt",
    createUser: async (data) => ({
      id: "user-3",
      name: data.name,
      email: data.email,
    }),
    deliverTemporaryPassword: async () => {
      throw new Error("provider indisponível");
    },
    sendWelcome: async () => assert.fail("não deveria enviar boas-vindas"),
    rollbackUser: async (userId) => {
      rolledBackUserId = userId;
    },
    generateTemporaryPassword: () => "Ez!senha-criptografica",
  };

  await assert.rejects(
    registerCheckoutUser(input, dependencies),
    (error: unknown) =>
      error instanceof AuthServiceError &&
      error.code === "EMAIL_DELIVERY_FAILED",
  );
  assert.equal(rolledBackUserId, "user-3");
});
