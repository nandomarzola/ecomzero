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
    // Guarda TODAS as rotas: sem sessão → /login. Já logado em /login → home.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isOnLogin = nextUrl.pathname === "/login";

      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
