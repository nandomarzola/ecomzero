export type AdminRouteGuardDecision =
  | { type: "allow" }
  | { type: "deny" }
  | { type: "redirect"; pathname: "/" | "/ativar-2fa" };

export function getAdminRouteGuardDecision({
  pathname,
  isLoggedIn,
  hasTwoFactor,
  requireTwoFactor = true,
}: {
  pathname: string;
  isLoggedIn: boolean;
  hasTwoFactor: boolean;
  requireTwoFactor?: boolean;
}): AdminRouteGuardDecision {
  if (
    pathname === "/login" ||
    pathname === "/recuperar-senha" ||
    pathname === "/redefinir-senha"
  ) {
    return { type: "allow" };
  }
  if (!isLoggedIn) return { type: "deny" };

  if (!requireTwoFactor) {
    return pathname === "/ativar-2fa"
      ? { type: "redirect", pathname: "/" }
      : { type: "allow" };
  }

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
  requireTwoFactor = true,
): "/" | "/ativar-2fa" | null {
  if (!user) return null;
  if (!requireTwoFactor) return "/";
  return user.twoFactorEnabled === true ? "/" : "/ativar-2fa";
}
