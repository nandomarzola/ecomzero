export type AdminRouteGuardDecision =
  | { type: "allow" }
  | { type: "deny" }
  | { type: "redirect"; pathname: "/" | "/ativar-2fa" };

export function getAdminRouteGuardDecision({
  pathname,
  isLoggedIn,
  hasTwoFactor,
}: {
  pathname: string;
  isLoggedIn: boolean;
  hasTwoFactor: boolean;
}): AdminRouteGuardDecision {
  if (
    pathname === "/login" ||
    pathname === "/recuperar-senha" ||
    pathname === "/redefinir-senha"
  ) {
    return { type: "allow" };
  }
  if (!isLoggedIn) return { type: "deny" };

  if (pathname === "/ativar-2fa") {
    return hasTwoFactor
      ? { type: "redirect", pathname: "/" }
      : { type: "allow" };
  }

  return hasTwoFactor
    ? { type: "allow" }
    : { type: "redirect", pathname: "/ativar-2fa" };
}

export function getAdminLoginRedirect(
  user: { twoFactorEnabled?: boolean } | null | undefined,
): "/" | "/ativar-2fa" | null {
  if (!user) return null;
  return user.twoFactorEnabled === true ? "/" : "/ativar-2fa";
}
