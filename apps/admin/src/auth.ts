import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";

// Config completa do NextAuth v5 — inclui o provider Credentials que valida o
// AdminUser no banco com bcrypt. Só é carregada no route handler (Node runtime),
// nunca no middleware edge. AUTH_SECRET é lido automaticamente do ambiente.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const admin = await prisma.adminUser.findUnique({ where: { email } });
        if (!admin) return null;

        const ok = await bcrypt.compare(password, admin.senhaHash);
        if (!ok) return null;

        return { id: admin.id, email: admin.email };
      },
    }),
  ],
});
