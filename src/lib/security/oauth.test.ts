import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { Auth, type AuthConfig } from "@auth/core";
import type {
  Adapter,
  AdapterAccount,
  AdapterUser,
} from "@auth/core/adapters";
import { createOAuthProviders } from "../oauthProviders";
import {
  getOAuthAvailability,
  isOAuthProfileAllowed,
  oauthErrorMessage,
  safeOAuthReturnTo,
} from "./oauth";

const oauthCredentials = {
  google: { clientId: "google-client-id", clientSecret: "google-secret" },
  facebook: {
    clientId: "facebook-client-id",
    clientSecret: "facebook-secret",
  },
};

function authConfig(adapter?: Adapter): AuthConfig {
  return {
    basePath: "/api/auth",
    secret: "test-secret-with-at-least-thirty-two-characters",
    trustHost: true,
    providers: createOAuthProviders(oauthCredentials),
    adapter,
    session: { strategy: "jwt" },
    callbacks: {
      signIn({ account, profile }) {
        if (
          account?.provider === "google" ||
          account?.provider === "facebook"
        ) {
          return Boolean(
            profile &&
              isOAuthProfileAllowed(
                account.provider,
                profile as Record<string, unknown>,
              ),
          );
        }
        return true;
      },
    },
  };
}

function addResponseCookies(response: Response, jar: Map<string, string>) {
  for (const setCookie of response.headers.getSetCookie()) {
    const pair = setCookie.split(";", 1)[0];
    const separator = pair.indexOf("=");
    jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function cookieHeader(jar: Map<string, string>) {
  return [...jar]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function csrfRequest(config: AuthConfig) {
  const response = await Auth(
    new Request("https://www.ecomzero.com.br/api/auth/csrf"),
    config,
  );
  const body = (await response.json()) as { csrfToken: string };
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);
  return { csrfToken: body.csrfToken, cookie };
}

async function startProviderSignIn(
  provider: "google" | "facebook",
  config: AuthConfig,
) {
  const { csrfToken, cookie } = await csrfRequest(config);
  return Auth(
    new Request(
      `https://www.ecomzero.com.br/api/auth/signin/${provider}`,
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          csrfToken,
          callbackUrl: "https://www.ecomzero.com.br/checkout",
        }),
      },
    ),
    config,
  );
}

test("só expõe providers com o par completo de credenciais", () => {
  assert.deepEqual(
    getOAuthAvailability({ google: null, facebook: oauthCredentials.facebook }),
    { google: false, facebook: true },
  );
  assert.deepEqual(createOAuthProviders({ google: null, facebook: null }), []);

  const googleOnly = createOAuthProviders({
    google: oauthCredentials.google,
    facebook: null,
  });
  assert.equal(googleOnly.length, 1);
  assert.equal(googleOnly[0].id, "google");
  assert.equal(
    (googleOnly[0] as { options?: { allowDangerousEmailAccountLinking?: boolean } })
      .options?.allowDangerousEmailAccountLinking,
    true,
  );
});

test("Google exige e-mail verificado e Facebook exige e-mail válido", () => {
  assert.equal(
    isOAuthProfileAllowed("google", {
      email: "cliente@example.com",
      email_verified: true,
    }),
    true,
  );
  assert.equal(
    isOAuthProfileAllowed("google", {
      email: "cliente@example.com",
      email_verified: false,
    }),
    false,
  );
  assert.equal(
    isOAuthProfileAllowed("facebook", { email: "cliente@example.com" }),
    true,
  );
  assert.equal(isOAuthProfileAllowed("facebook", { id: "123" }), false);
  assert.equal(
    isOAuthProfileAllowed("facebook", { email: "email-invalido" }),
    false,
  );
});

test("retorno OAuth só aceita destinos internos previstos", () => {
  assert.equal(safeOAuthReturnTo("/checkout"), "/checkout");
  assert.equal(safeOAuthReturnTo("/conta/dados"), "/conta/dados");
  assert.equal(safeOAuthReturnTo("https://evil.example/checkout"), "/");
  assert.equal(safeOAuthReturnTo("//evil.example"), "/");
  assert.equal(safeOAuthReturnTo(["/checkout"]), "/");
});

test("traduz erros OAuth sem expor detalhes internos", () => {
  assert.match(oauthErrorMessage("OAuthAccountNotLinked"), /já possui uma conta/);
  assert.match(oauthErrorMessage("AccessDenied"), /e-mail válido e verificado/);
  assert.match(oauthErrorMessage("Configuration"), /não está configurado/);
  assert.match(oauthErrorMessage("OAuthCallbackError"), /login social/);
  assert.equal(oauthErrorMessage(undefined), "");
});

test("Auth.js publica Google e Facebook com callbacks de produção", async () => {
  const response = await Auth(
    new Request("https://www.ecomzero.com.br/api/auth/providers"),
    authConfig(),
  );
  assert.equal(response.status, 200);

  const providers = (await response.json()) as Record<
    string,
    { callbackUrl: string; signinUrl: string }
  >;
  assert.deepEqual(Object.keys(providers), ["google", "facebook"]);
  assert.equal(
    providers.google.callbackUrl,
    "https://www.ecomzero.com.br/api/auth/callback/google",
  );
  assert.equal(
    providers.facebook.callbackUrl,
    "https://www.ecomzero.com.br/api/auth/callback/facebook",
  );
});

test("handshake E2E do Facebook redireciona ao consentimento correto", async () => {
  const response = await startProviderSignIn("facebook", authConfig());
  const location = response.headers.get("location");

  assert.equal(response.status, 302);
  assert.ok(location);
  const authorizationUrl = new URL(location);
  assert.equal(authorizationUrl.hostname, "www.facebook.com");
  assert.equal(authorizationUrl.searchParams.get("client_id"), "facebook-client-id");
  assert.equal(
    authorizationUrl.searchParams.get("redirect_uri"),
    "https://www.ecomzero.com.br/api/auth/callback/facebook",
  );
  assert.match(authorizationUrl.searchParams.get("scope") ?? "", /email/);
});

test("E2E simulado do Facebook cria usuário, vincula conta e emite sessão", async () => {
  const createdUsers: AdapterUser[] = [];
  const linkedAccounts: AdapterAccount[] = [];
  const adapter: Adapter = {
    async createUser(user) {
      const createdUser = { ...user, id: "oauth-user-id" };
      createdUsers.push(createdUser);
      return createdUser;
    },
    async getUserByAccount() {
      return null;
    },
    async getUserByEmail() {
      return null;
    },
    async linkAccount(account) {
      linkedAccounts.push(account);
      return account;
    },
  };
  const config = authConfig(adapter);
  const cookies = new Map<string, string>();
  const csrf = await Auth(
    new Request("https://www.ecomzero.com.br/api/auth/csrf"),
    config,
  );
  addResponseCookies(csrf, cookies);
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };

  const signInResponse = await Auth(
    new Request("https://www.ecomzero.com.br/api/auth/signin/facebook", {
      method: "POST",
      headers: {
        cookie: cookieHeader(cookies),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        csrfToken,
        callbackUrl: "https://www.ecomzero.com.br/checkout",
      }),
    }),
    config,
  );
  addResponseCookies(signInResponse, cookies);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.startsWith("https://graph.facebook.com/oauth/access_token")) {
      return Response.json({
        access_token: "facebook-access-token",
        token_type: "bearer",
        expires_in: 3600,
      });
    }
    if (url.startsWith("https://graph.facebook.com/me")) {
      return Response.json({
        id: "facebook-user-id",
        name: "Cliente E2E",
        email: "cliente-e2e@example.com",
        picture: { data: { url: "https://example.com/avatar.jpg" } },
      });
    }
    return originalFetch(input, init);
  };

  try {
    const callbackResponse = await Auth(
      new Request(
        "https://www.ecomzero.com.br/api/auth/callback/facebook?code=test-code",
        { headers: { cookie: cookieHeader(cookies) } },
      ),
      config,
    );

    assert.equal(callbackResponse.status, 302);
    assert.equal(
      callbackResponse.headers.get("location"),
      "https://www.ecomzero.com.br/checkout",
    );
    assert.equal(createdUsers[0]?.email, "cliente-e2e@example.com");
    assert.equal(linkedAccounts[0]?.provider, "facebook");
    assert.equal(linkedAccounts[0]?.providerAccountId, "facebook-user-id");
    assert.equal(linkedAccounts[0]?.userId, "oauth-user-id");
    assert.ok(
      callbackResponse.headers
        .getSetCookie()
        .some((cookie) => cookie.startsWith("__Secure-authjs.session-token=")),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("handshake E2E do Google redireciona ao consentimento correto", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.includes(".well-known/openid-configuration")) {
      return Response.json({
        issuer: "https://accounts.google.com",
        authorization_endpoint:
          "https://accounts.google.com/o/oauth2/v2/auth",
        token_endpoint: "https://oauth2.googleapis.com/token",
        userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo",
        jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
      });
    }

    return originalFetch(input, init);
  };

  try {
    const response = await startProviderSignIn("google", authConfig());
    const location = response.headers.get("location");

    assert.equal(response.status, 302);
    assert.ok(location);
    const authorizationUrl = new URL(location);
    assert.equal(authorizationUrl.hostname, "accounts.google.com");
    assert.equal(authorizationUrl.searchParams.get("client_id"), "google-client-id");
    assert.equal(
      authorizationUrl.searchParams.get("redirect_uri"),
      "https://www.ecomzero.com.br/api/auth/callback/google",
    );
    assert.match(authorizationUrl.searchParams.get("scope") ?? "", /email/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("E2E simulado do Google valida identidade, vincula conta e emite sessão", async () => {
  const createdUsers: AdapterUser[] = [];
  const linkedAccounts: AdapterAccount[] = [];
  const adapter: Adapter = {
    async createUser(user) {
      const createdUser = { ...user, id: "google-oauth-user-id" };
      createdUsers.push(createdUser);
      return createdUser;
    },
    async getUserByAccount() {
      return null;
    },
    async getUserByEmail() {
      return null;
    },
    async linkAccount(account) {
      linkedAccounts.push(account);
      return account;
    },
  };
  const config = authConfig(adapter);
  const cookies = new Map<string, string>();
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const publicJwk = publicKey.export({ format: "jwk" });
  const encodeJson = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: "RS256", kid: "google-test-key", typ: "JWT" });
  const payload = encodeJson({
    iss: "https://accounts.google.com",
    aud: "google-client-id",
    sub: "google-user-id",
    email: "google-e2e@example.com",
    email_verified: true,
    name: "Cliente Google E2E",
    picture: "https://example.com/google-avatar.jpg",
    iat: now,
    exp: now + 3600,
  });
  const signature = createSign("RSA-SHA256")
    .update(`${header}.${payload}`)
    .sign(privateKey)
    .toString("base64url");
  const idToken = `${header}.${payload}.${signature}`;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.includes(".well-known/openid-configuration")) {
      return Response.json({
        issuer: "https://accounts.google.com",
        authorization_endpoint:
          "https://accounts.google.com/o/oauth2/v2/auth",
        token_endpoint: "https://oauth2.googleapis.com/token",
        userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo",
        jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
      });
    }
    if (url === "https://oauth2.googleapis.com/token") {
      return Response.json({
        access_token: "google-access-token",
        token_type: "Bearer",
        expires_in: 3600,
        id_token: idToken,
      });
    }
    if (url === "https://www.googleapis.com/oauth2/v3/certs") {
      return Response.json({
        keys: [
          {
            ...publicJwk,
            kid: "google-test-key",
            alg: "RS256",
            use: "sig",
          },
        ],
      });
    }
    if (url === "https://openidconnect.googleapis.com/v1/userinfo") {
      return Response.json({
        sub: "google-user-id",
        email: "google-e2e@example.com",
        email_verified: true,
        name: "Cliente Google E2E",
        picture: "https://example.com/google-avatar.jpg",
      });
    }
    return originalFetch(input, init);
  };

  try {
    const csrf = await Auth(
      new Request("https://www.ecomzero.com.br/api/auth/csrf"),
      config,
    );
    addResponseCookies(csrf, cookies);
    const { csrfToken } = (await csrf.json()) as { csrfToken: string };
    const signInResponse = await Auth(
      new Request("https://www.ecomzero.com.br/api/auth/signin/google", {
        method: "POST",
        headers: {
          cookie: cookieHeader(cookies),
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          csrfToken,
          callbackUrl: "https://www.ecomzero.com.br/checkout",
        }),
      }),
      config,
    );
    addResponseCookies(signInResponse, cookies);

    const callbackResponse = await Auth(
      new Request(
        "https://www.ecomzero.com.br/api/auth/callback/google?code=test-code",
        { headers: { cookie: cookieHeader(cookies) } },
      ),
      config,
    );

    assert.equal(callbackResponse.status, 302);
    assert.equal(
      callbackResponse.headers.get("location"),
      "https://www.ecomzero.com.br/checkout",
    );
    assert.equal(createdUsers[0]?.email, "google-e2e@example.com");
    assert.equal(linkedAccounts[0]?.provider, "google");
    assert.equal(linkedAccounts[0]?.providerAccountId, "google-user-id");
    assert.equal(linkedAccounts[0]?.userId, "google-oauth-user-id");
    assert.ok(
      callbackResponse.headers
        .getSetCookie()
        .some((cookie) => cookie.startsWith("__Secure-authjs.session-token=")),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
