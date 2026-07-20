import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Proxy (ex-"middleware", renomeado no Next 16) de proteção. Instancia o
// NextAuth só com a config edge-safe (sem Prisma). O callback `authorized` em
// auth.config decide o acesso às rotas protegidas. /login fica livre no Edge;
// a página Node revalida a sessão no banco antes de qualquer redirecionamento.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Roda em tudo, exceto rotas de auth, assets do Next e arquivos com extensão.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
