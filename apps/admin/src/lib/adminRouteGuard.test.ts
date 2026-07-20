import assert from "node:assert/strict";
import test from "node:test";
import { authConfig, authorizeAdminRequest } from "../auth.config";
import {
  getAdminLoginRedirect,
  getAdminRouteGuardDecision,
  type AdminRouteGuardDecision,
} from "./security/adminRouteGuard";

const edgeScenarios: Array<{
  name: string;
  pathname: string;
  isLoggedIn: boolean;
  hasTwoFactor: boolean;
  expected: AdminRouteGuardDecision;
}> = [
  {
    name: "login sem sessão",
    pathname: "/login",
    isLoggedIn: false,
    hasTwoFactor: false,
    expected: { type: "allow" },
  },
  {
    name: "login com JWT antigo ainda decodificável no Edge",
    pathname: "/login",
    isLoggedIn: true,
    hasTwoFactor: false,
    expected: { type: "allow" },
  },
  {
    name: "ativação sem sessão",
    pathname: "/ativar-2fa",
    isLoggedIn: false,
    hasTwoFactor: false,
    expected: { type: "deny" },
  },
  {
    name: "ativação com sessão sem 2FA",
    pathname: "/ativar-2fa",
    isLoggedIn: true,
    hasTwoFactor: false,
    expected: { type: "allow" },
  },
  {
    name: "ativação com sessão e 2FA",
    pathname: "/ativar-2fa",
    isLoggedIn: true,
    hasTwoFactor: true,
    expected: { type: "redirect", pathname: "/" },
  },
  {
    name: "rota protegida sem sessão",
    pathname: "/pedidos",
    isLoggedIn: false,
    hasTwoFactor: false,
    expected: { type: "deny" },
  },
  {
    name: "rota protegida com sessão sem 2FA",
    pathname: "/pedidos",
    isLoggedIn: true,
    hasTwoFactor: false,
    expected: { type: "redirect", pathname: "/ativar-2fa" },
  },
  {
    name: "rota protegida com sessão e 2FA",
    pathname: "/pedidos",
    isLoggedIn: true,
    hasTwoFactor: true,
    expected: { type: "allow" },
  },
];

test("guard Edge cobre os 8 cenários de autenticação e 2FA", async (t) => {
  for (const scenario of edgeScenarios) {
    await t.test(scenario.name, () => {
      assert.deepEqual(
        getAdminRouteGuardDecision({
          pathname: scenario.pathname,
          isLoggedIn: scenario.isLoggedIn,
          hasTwoFactor: scenario.hasTwoFactor,
        }),
        scenario.expected,
      );
    });
  }
});

test("página Node de login decide somente após auth() revalidar a sessão", () => {
  assert.equal(getAdminLoginRedirect(null), null);
  assert.equal(
    getAdminLoginRedirect({ twoFactorEnabled: false }),
    "/ativar-2fa",
  );
  assert.equal(getAdminLoginRedirect({ twoFactorEnabled: true }), "/");
});

test("sandbox com 2FA desativado libera painel e não abre rota de ativação", () => {
  assert.deepEqual(
    getAdminRouteGuardDecision({
      pathname: "/pedidos",
      isLoggedIn: true,
      hasTwoFactor: false,
      requireTwoFactor: false,
    }),
    { type: "allow" },
  );
  assert.deepEqual(
    getAdminRouteGuardDecision({
      pathname: "/ativar-2fa",
      isLoggedIn: true,
      hasTwoFactor: false,
      requireTwoFactor: false,
    }),
    { type: "redirect", pathname: "/" },
  );
  assert.equal(
    getAdminLoginRedirect({ twoFactorEnabled: false }, false),
    "/",
  );
});

test("callback real do guard libera /login para JWT Edge potencialmente revogado", async () => {
  assert.equal(authConfig.callbacks.authorized, authorizeAdminRequest);

  const result = await authConfig.callbacks.authorized({
    auth: { user: { twoFactorEnabled: false } },
    request: { nextUrl: new URL("https://admin.ecomzero.com.br/login") },
  });

  assert.equal(result, true);
});
