import type { NextAuthConfig } from "next-auth";
import { getAdminRouteGuardDecision } from "@/lib/security/adminRouteGuard";

type AdminAuthorizedInput = {
  auth: { user?: { twoFactorEnabled?: boolean } } | null;
  request: { nextUrl: URL };
};

export function authorizeAdminRequest({
  auth,
  request: { nextUrl },
}: AdminAuthorizedInput) {
  const decision = getAdminRouteGuardDecision({
    pathname: nextUrl.pathname,
    isLoggedIn: Boolean(auth?.user),
    hasTwoFactor: auth?.user?.twoFactorEnabled === true,
    requireTwoFactor: process.env.ADMIN_REQUIRE_2FA !== "false",
  });

  if (decision.type === "allow") return true;
  if (decision.type === "deny") return false;
  return Response.redirect(new URL(decision.pathname, nextUrl));
}

// Config edge-safe (SEM Prisma/bcrypt) — usada pelo middleware, que roda no
// edge runtime. A validação de credenciais com Prisma vive só em auth.ts,
// carregada pelo route handler (Node runtime). Padrão recomendado do
// NextAuth v5 para projetos com Prisma + middleware.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [], // Credentials é adicionado em auth.ts (precisa de Prisma).
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role === "staff" ? "staff" : "owner";
        session.user.twoFactorEnabled = token.twoFactorEnabled === true;
      }
      return session;
    },
    authorized: authorizeAdminRequest,
  },
} satisfies NextAuthConfig;
