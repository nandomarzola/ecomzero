import { createHash } from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
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
import {
  challengeRateLimitIdentity,
  consumeAdminEmailChallenge,
  consumeAdminRecoveryChallenge,
  validateAdminPassword,
} from "@/lib/services/adminLoginChallengeService";

const LOGIN_MAX_FAILURES = 5; // por IP e por e-mail, em janela de 15 min

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
        challengeToken: { label: "Desafio", type: "text" },
        verificationCode: { label: "Código por e-mail", type: "text" },
        recoveryCode: { label: "Código de recuperação", type: "text" },
      },
      async authorize(credentials) {
        const challengeToken =
          typeof credentials?.challengeToken === "string"
            ? credentials.challengeToken.trim()
            : "";
        const verificationCode =
          typeof credentials?.verificationCode === "string"
            ? credentials.verificationCode.trim()
            : "";
        const recoveryCode =
          typeof credentials?.recoveryCode === "string"
            ? credentials.recoveryCode.trim()
            : "";

        if (challengeToken && (verificationCode || recoveryCode)) {
          const identity = await challengeRateLimitIdentity(challengeToken);
          if (!identity) return null;

          const ipKey = rateLimitKey("admin-login-code-ip", await clientIp());
          const tokenFingerprint = createHash("sha256")
            .update(challengeToken)
            .digest("hex")
            .slice(0, 32);
          const challengeKey = rateLimitKey(
            "admin-login-code-challenge",
            tokenFingerprint,
          );
          const adminKey = rateLimitKey("admin-login-code-admin", identity);
          const keys = [ipKey, challengeKey, adminKey];
          if (
            (await Promise.all(
              keys.map((key) => isRateLimited(key, LOGIN_MAX_FAILURES)),
            )).some(Boolean)
          ) {
            return null;
          }

          const admin = verificationCode
            ? await consumeAdminEmailChallenge(
                challengeToken,
                verificationCode,
              )
            : await consumeAdminRecoveryChallenge(
                challengeToken,
                recoveryCode,
              );
          if (!admin) {
            await Promise.all(keys.map(registerAttempt));
            return null;
          }

          await Promise.all(keys.map(clearAttempts));
          return {
            id: admin.id,
            email: admin.email,
            role: admin.role,
            twoFactorEnabled: admin.twoFactorEnabled,
          };
        }

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

        const admin = await validateAdminPassword(email, password);
        if (!admin) {
          await Promise.all([
            registerAttempt(ipKey),
            registerAttempt(emailKey),
          ]);
          return null;
        }

        if (admin.twoFactorEnabled) return null;

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
