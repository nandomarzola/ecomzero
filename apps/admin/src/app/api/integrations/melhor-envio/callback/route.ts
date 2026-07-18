import { NextResponse, type NextRequest } from "next/server";
import { requireVerifiedAdmin } from "@/lib/security/adminAuthorization";
import { prisma } from "@/lib/db";
import { getMelhorEnvioOAuthConfig } from "@/lib/services/melhorEnvioAdminService";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number | string;
};

function redirectWithResult(request: NextRequest, result: string) {
  const response = NextResponse.redirect(new URL(`/fretes?oauth=${result}`, request.url));
  response.cookies.delete("ecomzero_me_oauth_state");
  return response;
}

export async function GET(request: NextRequest) {
  if (!(await requireVerifiedAdmin({ owner: true })).ok) return NextResponse.redirect(new URL("/login", request.url));

  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("ecomzero_me_oauth_state")?.value;
  const code = request.nextUrl.searchParams.get("code");
  if (!state || !savedState || state !== savedState || !code) {
    return redirectWithResult(request, "invalid");
  }

  const { baseUrl, clientId, clientSecret } = getMelhorEnvioOAuthConfig();
  if (!clientId || !clientSecret) return redirectWithResult(request, "config");

  const redirectUri = new URL(
    "/api/integrations/melhor-envio/callback",
    request.nextUrl.origin,
  ).toString();
  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "EcomZero (contato@ecomzero.com.br)",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);

  if (!response?.ok) return redirectWithResult(request, "failed");
  const data = (await response.json().catch(() => null)) as TokenResponse | null;
  const expiresIn = Number(data?.expires_in);
  if (!data?.access_token || !data.refresh_token || !Number.isFinite(expiresIn)) {
    return redirectWithResult(request, "failed");
  }

  await prisma.melhorEnvioCredential.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiraEm: new Date(Date.now() + expiresIn * 1000),
    },
    update: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiraEm: new Date(Date.now() + expiresIn * 1000),
    },
  });

  return redirectWithResult(request, "success");
}
