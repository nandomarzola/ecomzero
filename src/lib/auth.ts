import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import { validateCredentials } from "@/lib/services/authService";
import { loginSchema } from "@/lib/validation/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: config.authSecret,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse({
          email: credentials.email,
          senha: credentials.senha,
        });
        if (!parsed.success) return null;
        return validateCredentials(parsed.data.email, parsed.data.senha);
      },
    }),
  ],
});
