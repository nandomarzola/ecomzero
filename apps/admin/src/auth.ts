import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import {
  clearAttempts,
  clientIp,
  isRateLimited,
  rateLimitKey,
  registerAttempt,
} from "@/lib/security/authRateLimit";

const LOGIN_MAX_FAILURES = 5; // por IP e por e-mail, em janela de 15 min

// Hash descartável para gastar o mesmo tempo de bcrypt quando o e-mail não
// existe — evita enumeração de admin por timing.
const DUMMY_PASSWORD_HASH =
  "$2b$12$4j/YCPB6oHNSBBpPVnk2L.fpJSP1wy39KKX3Cd5.D1lPOdBTqTG3G";

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

        const ipKey = rateLimitKey("login-admin-ip", await clientIp());
        const emailKey = rateLimitKey("login-admin-email", email);
        if (
          (await isRateLimited(ipKey, LOGIN_MAX_FAILURES)) ||
          (await isRateLimited(emailKey, LOGIN_MAX_FAILURES))
        ) {
          return null;
        }

        const admin = await prisma.adminUser.findUnique({ where: { email } });
        // Compara sempre (contra o hash real ou o dummy) para não vazar a
        // existência do e-mail por timing.
        const ok = await bcrypt.compare(
          password,
          admin?.senhaHash ?? DUMMY_PASSWORD_HASH,
        );
        if (!admin || !ok) {
          await Promise.all([
            registerAttempt(ipKey),
            registerAttempt(emailKey),
          ]);
          return null;
        }
        await Promise.all([clearAttempts(ipKey), clearAttempts(emailKey)]);
        return { id: admin.id, email: admin.email };
      },
    }),
  ],
});
