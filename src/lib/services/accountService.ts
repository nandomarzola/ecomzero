import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import type {
  ChangePasswordInput,
  CreateAddressInput,
  UpdateAddressInput,
  UpdateProfileInput,
} from "@/lib/validation/account";

type AccountServiceErrorCode =
  | "USER_NOT_FOUND"
  | "CURRENT_PASSWORD_INCORRECT"
  | "ADDRESS_NOT_FOUND";

export class AccountServiceError extends Error {
  constructor(
    message: string,
    public readonly code: AccountServiceErrorCode,
  ) {
    super(message);
    this.name = "AccountServiceError";
  }
}

const addressSelect = {
  id: true,
  apelido: true,
  cep: true,
  logradouro: true,
  numero: true,
  complemento: true,
  bairro: true,
  cidade: true,
  uf: true,
  padrao: true,
} as const;

export async function getOrdersByUser(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId, status: { not: "draft" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      items: {
        select: {
          quantidade: true,
          variant: {
            select: {
              product: { select: { nome: true, imagem: true } },
            },
          },
        },
      },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    status: order.status as "aguardando_pagamento" | "pago" | "cancelado",
    total: order.total.toNumber(),
    createdAt: order.createdAt,
    produtos: order.items.map((item) => ({
      nome: item.variant.product.nome,
      quantidade: item.quantidade,
      imagem: item.variant.product.imagem,
    })),
  }));
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, telefone: true },
  });

  if (!user) {
    throw new AccountServiceError("Usuário não encontrado", "USER_NOT_FOUND");
  }

  return {
    nome: user.name,
    email: user.email,
    telefone: user.telefone,
  };
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
) {
  const result = await prisma.user.updateMany({
    where: { id: userId },
    data: {
      name: input.nome,
      telefone: input.telefone,
    },
  });

  if (result.count !== 1) {
    throw new AccountServiceError("Usuário não encontrado", "USER_NOT_FOUND");
  }

  return getProfile(userId);
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { senhaHash: true },
  });
  const passwordMatches =
    user?.senhaHash &&
    (await verifyPassword(input.senhaAtual, user.senhaHash));

  if (!passwordMatches) {
    throw new AccountServiceError(
      "Senha atual incorreta",
      "CURRENT_PASSWORD_INCORRECT",
    );
  }

  const senhaHash = await hashPassword(input.senhaNova);
  await prisma.user.update({
    where: { id: userId },
    data: { senhaHash },
  });
}

export async function getAddressesByUser(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ padrao: "desc" }, { apelido: "asc" }, { id: "asc" }],
    select: addressSelect,
  });
}

export async function createAddress(
  userId: string,
  input: CreateAddressInput,
) {
  return prisma.$transaction(async (transaction) => {
    if (input.padrao) {
      await transaction.address.updateMany({
        where: { userId, padrao: true },
        data: { padrao: false },
      });
    }

    return transaction.address.create({
      data: {
        userId,
        apelido: input.apelido ?? null,
        cep: input.cep,
        logradouro: input.logradouro,
        numero: input.numero,
        complemento: input.complemento ?? null,
        bairro: input.bairro,
        cidade: input.cidade,
        uf: input.uf,
        padrao: input.padrao ?? false,
      },
      select: addressSelect,
    });
  });
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: UpdateAddressInput,
) {
  return prisma.$transaction(async (transaction) => {
    const address = await transaction.address.findFirst({
      where: { id: addressId, userId },
      select: { id: true },
    });

    if (!address) {
      throw new AccountServiceError(
        "Endereço não encontrado",
        "ADDRESS_NOT_FOUND",
      );
    }

    if (input.padrao === true) {
      await transaction.address.updateMany({
        where: { userId, id: { not: addressId }, padrao: true },
        data: { padrao: false },
      });
    }

    return transaction.address.update({
      where: { id: addressId },
      data: {
        apelido: input.apelido,
        cep: input.cep,
        logradouro: input.logradouro,
        numero: input.numero,
        complemento: input.complemento,
        bairro: input.bairro,
        cidade: input.cidade,
        uf: input.uf,
        padrao: input.padrao,
      },
      select: addressSelect,
    });
  });
}

export async function deleteAddress(
  userId: string,
  addressId: string,
): Promise<void> {
  const result = await prisma.address.deleteMany({
    where: { id: addressId, userId },
  });

  if (result.count !== 1) {
    throw new AccountServiceError(
      "Endereço não encontrado",
      "ADDRESS_NOT_FOUND",
    );
  }
}
