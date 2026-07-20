export const oauthProviderIds = ["google", "facebook"] as const;

export type OAuthProviderId = (typeof oauthProviderIds)[number];

export type OAuthAvailability = Record<OAuthProviderId, boolean>;

export function getOAuthAvailability(oauth: {
  google: unknown | null;
  facebook: unknown | null;
}): OAuthAvailability {
  return {
    google: Boolean(oauth.google),
    facebook: Boolean(oauth.facebook),
  };
}

function hasValidEmail(profile: Record<string, unknown>) {
  return (
    typeof profile.email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)
  );
}

export function isOAuthProfileAllowed(
  provider: string,
  profile: Record<string, unknown>,
) {
  if (!hasValidEmail(profile)) return false;
  if (provider === "google") return profile.email_verified === true;
  return provider === "facebook";
}

const allowedReturnPaths = new Set(["/", "/checkout", "/conta/dados"]);

export function safeOAuthReturnTo(
  value: string | string[] | undefined,
  fallback: "/" | "/checkout" | "/conta/dados" = "/",
): "/" | "/checkout" | "/conta/dados" {
  if (typeof value !== "string") return fallback;
  return allowedReturnPaths.has(value)
    ? (value as "/" | "/checkout" | "/conta/dados")
    : fallback;
}

export function oauthErrorMessage(error: string | string[] | undefined) {
  if (typeof error !== "string") return "";

  if (error === "OAuthAccountNotLinked") {
    return "Este e-mail já possui uma conta. Entre com sua senha e conecte a rede social em Minha conta > Meus dados.";
  }

  if (error === "AccessDenied") {
    return "O provedor não disponibilizou um e-mail válido e verificado para continuar.";
  }

  if (error === "Configuration") {
    return "O login social ainda não está configurado. Entre com e-mail e senha.";
  }

  return "Não foi possível concluir o login social. Tente novamente.";
}
