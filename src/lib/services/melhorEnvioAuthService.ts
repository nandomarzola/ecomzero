import { prisma } from "@/lib/db";
import { config } from "@/lib/config";

// Autenticação OAuth do Melhor Envio em PRODUÇÃO. Única camada que lê/grava o
// singleton MelhorEnvioCredential. O access_token de produção expira em ~30 dias;
// aqui ele é renovado sozinho via refresh_token quando está perto de vencer, sem
// intervenção manual. O ambiente sandbox NÃO passa por aqui — usa o
// MELHOR_ENVIO_TOKEN fixo direto no shippingService.

// Renova com 24h de folga antes do vencimento — evita usar um token que expira
// no meio de uma requisição e dá margem pra retries.
const REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000;

export class MelhorEnvioAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MelhorEnvioAuthError";
  }
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

// Renova o par de tokens no Melhor Envio e persiste o resultado no singleton.
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { baseUrl, clientId, clientSecret } = config.melhorEnvio;

  if (!clientId || !clientSecret) {
    throw new MelhorEnvioAuthError(
      "MELHOR_ENVIO_CLIENT_ID/SECRET ausentes — não é possível renovar o access_token de produção.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "ecomzero (contato@ecomzero.com.br)",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new MelhorEnvioAuthError("Falha de rede ao renovar o token do Melhor Envio.");
  }

  if (!response.ok) {
    throw new MelhorEnvioAuthError(
      `Melhor Envio recusou o refresh (HTTP ${response.status}). O refresh_token pode ter expirado — refazer a autorização OAuth.`,
    );
  }

  const data = (await response.json().catch(() => null)) as TokenResponse | null;
  if (!data?.access_token || !data.refresh_token || !data.expires_in) {
    throw new MelhorEnvioAuthError("Resposta de refresh do Melhor Envio sem os campos esperados.");
  }

  const expiraEm = new Date(Date.now() + data.expires_in * 1000);
  await prisma.melhorEnvioCredential.update({
    where: { id: "singleton" },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiraEm,
    },
  });

  return data.access_token;
}

// Retorna um access_token de produção válido, renovando automaticamente se
// estiver perto de expirar. Lança MelhorEnvioAuthError se não houver credencial
// gravada ou se a renovação falhar.
export async function getValidAccessToken(): Promise<string> {
  const cred = await prisma.melhorEnvioCredential.findUnique({
    where: { id: "singleton" },
  });

  if (!cred) {
    throw new MelhorEnvioAuthError(
      "Nenhuma credencial de produção do Melhor Envio no banco — rodar o fluxo OAuth e scripts/save-melhor-envio-token.ts.",
    );
  }

  const precisaRenovar = cred.expiraEm.getTime() - Date.now() < REFRESH_MARGIN_MS;
  if (!precisaRenovar) {
    return cred.accessToken;
  }

  return refreshAccessToken(cred.refreshToken);
}
