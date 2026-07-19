import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { generateTemporaryPassword } from "@/lib/security/temporaryPassword";
import { sendCheckoutTemporaryPasswordEmail } from "@/lib/services/emailService";
import { sendWelcomeEmail } from "@/lib/services/transactionalEmailService";
import type {
  CheckoutRegisterInput,
  RegisterInput,
} from "@/lib/validation/auth";

const DUMMY_PASSWORD_HASH =
  "$2b$12$4j/YCPB6oHNSBBpPVnk2L.fpJSP1wy39KKX3Cd5.D1lPOdBTqTG3G";

export class AuthServiceError extends Error {
  code: "EMAIL_ALREADY_REGISTERED" | "EMAIL_DELIVERY_FAILED";

  constructor(
    message: string,
    code: "EMAIL_ALREADY_REGISTERED" | "EMAIL_DELIVERY_FAILED",
  ) {
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

type CheckoutUserRecord = {
  id: string;
  name: string | null;
  email: string;
};

type CheckoutUserCreateInput = {
  name: string;
  email: string;
  senhaHash: string;
  telefone: string;
  aceitaMarketing: false;
  mustChangePassword: true;
};

export type CheckoutRegistrationDependencies = {
  findExistingUser: (email: string) => Promise<boolean>;
  hashTemporaryPassword: (password: string) => Promise<string>;
  createUser: (input: CheckoutUserCreateInput) => Promise<CheckoutUserRecord>;
  deliverTemporaryPassword: (input: {
    userId: string;
    to: string;
    name: string;
    temporaryPassword: string;
  }) => ReturnType<typeof sendCheckoutTemporaryPasswordEmail>;
  sendWelcome: (user: SafeUser) => Promise<void>;
  rollbackUser: (userId: string) => Promise<void>;
  generateTemporaryPassword: () => string;
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

    const safeUser = {
      id: user.id,
      name: user.name ?? input.nome,
      email: user.email,
    };
    await sendWelcomeEmail(safeUser);
    return safeUser;
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

async function rollbackCheckoutRegistration(userId: string): Promise<void> {
  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {
    console.error("[auth] falha ao remover cadastro sem e-mail confirmado", {
      userId,
      reason: error instanceof Error ? error.name : "unknown_error",
    });
    await prisma.user
      .updateMany({
        where: { id: userId },
        data: { senhaHash: null },
      })
      .catch(() => undefined);
  }
}

const checkoutRegistrationDependencies: CheckoutRegistrationDependencies = {
  findExistingUser: async (email) =>
    Boolean(
      await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      }),
    ),
  hashTemporaryPassword: hashPassword,
  createUser: (data) =>
    prisma.user.create({
      data,
      select: { id: true, name: true, email: true },
    }),
  deliverTemporaryPassword: sendCheckoutTemporaryPasswordEmail,
  sendWelcome: sendWelcomeEmail,
  rollbackUser: rollbackCheckoutRegistration,
  generateTemporaryPassword,
};

export async function registerCheckoutUser(
  input: CheckoutRegisterInput,
  dependencies: CheckoutRegistrationDependencies =
    checkoutRegistrationDependencies,
): Promise<{ user: SafeUser; temporaryPassword: string }> {
  const email = input.email.trim().toLowerCase();
  const existingUser = await dependencies.findExistingUser(email);

  if (existingUser) {
    throw new AuthServiceError(
      "Este e-mail já está cadastrado",
      "EMAIL_ALREADY_REGISTERED",
    );
  }

  const temporaryPassword = dependencies.generateTemporaryPassword();
  const senhaHash = await dependencies.hashTemporaryPassword(temporaryPassword);

  try {
    const user = await dependencies.createUser({
      name: input.nome,
      email,
      senhaHash,
      telefone: input.telefone,
      aceitaMarketing: false,
      mustChangePassword: true,
    });
    const safeUser = {
      id: user.id,
      name: user.name ?? input.nome,
      email: user.email,
    };
    const delivery = await dependencies
      .deliverTemporaryPassword({
        userId: user.id,
        to: user.email,
        name: safeUser.name,
        temporaryPassword,
      })
      .catch(async () => {
        await dependencies.rollbackUser(user.id);
        throw new AuthServiceError(
          "Não foi possível enviar sua senha temporária. Tente novamente em alguns minutos.",
          "EMAIL_DELIVERY_FAILED",
        );
      });

    if (delivery.status !== "sent") {
      await dependencies.rollbackUser(user.id);
      throw new AuthServiceError(
        "Não foi possível enviar sua senha temporária. Tente novamente em alguns minutos.",
        "EMAIL_DELIVERY_FAILED",
      );
    }

    await dependencies.sendWelcome(safeUser).catch((error) => {
      console.error("[email] falha no envio de boas-vindas após checkout", {
        userId: user.id,
        reason: error instanceof Error ? error.name : "unknown_error",
      });
    });
    return { user: safeUser, temporaryPassword };
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
