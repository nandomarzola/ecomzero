import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { config } from "@/lib/config";
import { prisma } from "@/lib/db";
import { createOAuthProviders } from "@/lib/oauthProviders";
import { isOAuthProfileAllowed } from "@/lib/security/oauth";
import {
  getSessionIssuedAt,
  isSessionValidForCutoff,
} from "@/lib/security/sessionSecurity";
import { validateCredentials } from "@/lib/services/authService";
import { loginSchema } from "@/lib/validation/auth";
import {
  clearAttempts,
  clientIp,
  isRateLimited,
  rateLimitKey,
  registerAttempt,
} from "@/lib/security/authRateLimit";
import { sendWelcomeEmail } from "@/lib/services/transactionalEmailService";

const LOGIN_MAX_FAILURES = 5; // por IP e por e-mail, em janela de 15 min

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: config.authSecret,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider === "google" || account?.provider === "facebook") {
        return Boolean(
          profile &&
            isOAuthProfileAllowed(
              account.provider,
              profile as Record<string, unknown>,
            ),
        );
      }

      return true;
    },
    async jwt({ token, user }) {
      const sessionIssuedAt = user ? Date.now() : getSessionIssuedAt(token);
      if (!token.sub || sessionIssuedAt === null) return null;

      const securityState = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { sessionsValidAfter: true },
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
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      await sendWelcomeEmail({
        id: user.id,
        name: user.name ?? user.email.split("@")[0],
        email: user.email,
      });
    },
    async linkAccount({ user, account }) {
      if (account.provider !== "google") return;
      await prisma.user.updateMany({
        where: { id: user.id, emailVerified: null },
        data: { emailVerified: new Date() },
      });
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

        const ipKey = rateLimitKey("login-cliente-ip", await clientIp());
        const emailKey = rateLimitKey("login-cliente-email", parsed.data.email);
        if (
          (await isRateLimited(ipKey, LOGIN_MAX_FAILURES)) ||
          (await isRateLimited(emailKey, LOGIN_MAX_FAILURES))
        ) {
          return null; // bloqueado — credenciais nem são checadas
        }

        const user = await validateCredentials(
          parsed.data.email,
          parsed.data.senha,
        );
        if (!user) {
          await Promise.all([
            registerAttempt(ipKey),
            registerAttempt(emailKey),
          ]);
          return null;
        }
        await Promise.all([clearAttempts(ipKey), clearAttempts(emailKey)]);
        return user;
      },
    }),
    ...createOAuthProviders(config.oauth),
  ],
});
