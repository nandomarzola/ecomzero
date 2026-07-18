import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import {
  getSessionIssuedAt,
  isSessionValidForCutoff,
} from "@/lib/security/sessionSecurity";
import {
  clearAttempts,
  clientIp,
  isRateLimited,
  rateLimitKey,
  registerAttempt,
} from "@/lib/security/authRateLimit";
import { verifyAndConsumeAdminSecondFactor } from "@/lib/services/adminTwoFactorService";

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
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      const sessionIssuedAt = user ? Date.now() : getSessionIssuedAt(token);
      if (!token.sub || sessionIssuedAt === null) return null;

      const securityState = await prisma.adminUser.findUnique({
        where: { id: token.sub },
        select: {
          role: true,
          sessionsValidAfter: true,
          twoFactorEnabled: true,
        },
      });
      if (
        !securityState ||
        !isSessionValidForCutoff(
          sessionIssuedAt,
          securityState.sessionsValidAfter,
        )
      ) {
        return null;
      }

      token.sessionIssuedAt = sessionIssuedAt;
      token.role = securityState.role;
      token.twoFactorEnabled = securityState.twoFactorEnabled;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role === "staff" ? "staff" : "owner";
        session.user.twoFactorEnabled = token.twoFactorEnabled === true;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
        code: { label: "Código 2FA", type: "text" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        const code =
          typeof credentials?.code === "string" ? credentials.code.trim() : "";
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

        if (
          admin.twoFactorEnabled &&
          (!code || !(await verifyAndConsumeAdminSecondFactor(admin, code)))
        ) {
          await Promise.all([
            registerAttempt(ipKey),
            registerAttempt(emailKey),
          ]);
          return null;
        }

        await Promise.all([clearAttempts(ipKey), clearAttempts(emailKey)]);
        return {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          twoFactorEnabled: admin.twoFactorEnabled,
        };
      },
    }),
  ],
});
