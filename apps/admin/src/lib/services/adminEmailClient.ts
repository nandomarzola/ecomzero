import { config } from "@/lib/config";

function storefrontBaseUrl() {
  return (
    config.storefrontUrl ??
    (config.nodeEnv === "production"
      ? "https://www.ecomzero.com.br"
      : "http://localhost:3000")
  ).replace(/\/$/, "");
}

export async function sendAdminLoginCodeViaStorefront(input: {
  email: string;
  code: string;
  challengeId: string;
  requestId: string;
  expiresInMinutes: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!config.storefrontSyncApiKey) {
    console.error("[admin-2fa] envio indisponível: integração com storefront não configurada");
    return { ok: false, error: "Envio de e-mail não configurado." };
  }

  try {
    const response = await fetch(
      `${storefrontBaseUrl()}/api/admin/auth/login-code`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.storefrontSyncApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!response.ok) {
      console.error("[admin-2fa] storefront recusou envio", {
        challengeId: input.challengeId,
        status: response.status,
      });
      return { ok: false, error: `Storefront respondeu HTTP ${response.status}.` };
    }
    return { ok: true };
  } catch (error) {
    console.error("[admin-2fa] falha ao solicitar envio", {
      challengeId: input.challengeId,
      name: error instanceof Error ? error.name : "unknown_error",
    });
    return { ok: false, error: "Não foi possível contatar o serviço de e-mail." };
  }
}
