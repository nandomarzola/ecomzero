import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireVerifiedAdmin } from "@/lib/security/adminAuthorization";
import { getMelhorEnvioOAuthConfig } from "@/lib/services/melhorEnvioAdminService";

const SCOPES = [
  "cart-read",
  "cart-write",
  "orders-read",
  "shipping-calculate",
  "shipping-cancel",
  "shipping-checkout",
  "shipping-generate",
  "shipping-print",
  "shipping-tracking",
  "ecommerce-shipping",
  "users-read",
].join(" ");

export async function GET(request: NextRequest) {
  if (!(await requireVerifiedAdmin({ owner: true })).ok) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { baseUrl, clientId, clientSecret } = getMelhorEnvioOAuthConfig();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/fretes?oauth=config", request.url));
  }

  const state = randomUUID();
  const redirectUri = new URL(
    "/api/integrations/melhor-envio/callback",
    request.nextUrl.origin,
  ).toString();
  const authorizationUrl = new URL("/oauth/authorize", baseUrl);
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("scope", SCOPES);

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set("ecomzero_me_oauth_state", state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
