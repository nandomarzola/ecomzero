import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import type { RegisterInput } from "@/lib/validation/auth";

const DUMMY_PASSWORD_HASH =
  "$2b$12$4j/YCPB6oHNSBBpPVnk2L.fpJSP1wy39KKX3Cd5.D1lPOdBTqTG3G";

export class AuthServiceError extends Error {
  code: "EMAIL_ALREADY_REGISTERED";

  constructor(message: string, code: "EMAIL_ALREADY_REGISTERED") {
    super(message);
    this.name = "AuthServiceError";
    this.code = code;
  }
}

export type SafeUser = {
  id: string;
  name: string;
  email: string;
};

export async function registerUser(input: RegisterInput): Promise<SafeUser> {
  const email = input.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new AuthServiceError(
      "Este e-mail já está cadastrado",
      "EMAIL_ALREADY_REGISTERED",
    );
  }

  const senhaHash = await hashPassword(input.senha);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.nome,
        email,
        senhaHash,
        telefone: input.telefone ?? null,
        aceitaMarketing: input.aceitaMarketing,
      },
      select: { id: true, name: true, email: true },
    });

    return { id: user.id, name: user.name ?? input.nome, email: user.email };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AuthServiceError(
        "Este e-mail já está cadastrado",
        "EMAIL_ALREADY_REGISTERED",
      );
    }
    throw error;
  }
}

export async function validateCredentials(
  emailInput: string,
  senha: string,
): Promise<SafeUser | null> {
  const email = emailInput.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  const senhaHash = user?.senhaHash ?? DUMMY_PASSWORD_HASH;
  const passwordMatches = await verifyPassword(senha, senhaHash);

  if (!user || !user.senhaHash || !passwordMatches) return null;

  return {
    id: user.id,
    name: user.name ?? "Cliente EcomZero",
    email: user.email,
  };
}
