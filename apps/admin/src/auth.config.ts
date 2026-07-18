import type { NextAuthConfig } from "next-auth";

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
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isOnLogin = nextUrl.pathname === "/login";
      const isOnTwoFactorSetup = nextUrl.pathname === "/ativar-2fa";
      const hasTwoFactor = auth?.user?.twoFactorEnabled === true;

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(
            new URL(hasTwoFactor ? "/" : "/ativar-2fa", nextUrl),
          );
        }
        return true;
      }

      if (!isLoggedIn) return false;
      if (isOnTwoFactorSetup) {
        return hasTwoFactor
          ? Response.redirect(new URL("/", nextUrl))
          : true;
      }
      return hasTwoFactor
        ? true
        : Response.redirect(new URL("/ativar-2fa", nextUrl));
    },
  },
} satisfies NextAuthConfig;
