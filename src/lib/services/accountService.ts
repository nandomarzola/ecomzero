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
      shipment: {
        select: {
          status: true,
          labelStatus: true,
          transportadora: true,
          servico: true,
          codigoRastreio: true,
          urlRastreio: true,
        },
      },
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
    shipment: order.shipment,
    produtos: order.items.map((item) => ({
      nome: item.variant.product.nome,
      quantidade: item.quantidade,
      imagem: item.variant.product.imagem,
    })),
  }));
}

export async function getOrderByUser(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, status: { not: "draft" } },
    select: {
      id: true,
      status: true,
      nomeCliente: true,
      emailCliente: true,
      telefoneCliente: true,
      cepDestino: true,
      logradouro: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      uf: true,
      subtotal: true,
      valorFrete: true,
      total: true,
      pagoEm: true,
      createdAt: true,
      shipment: {
        select: {
          status: true,
          labelStatus: true,
          transportadora: true,
          servico: true,
          codigoRastreio: true,
          urlRastreio: true,
          postadoEm: true,
          entregueEm: true,
          updatedAt: true,
        },
      },
      items: {
        select: {
          id: true,
          quantidade: true,
          precoUnitario: true,
          variant: {
            select: {
              label: true,
              product: { select: { id: true, nome: true, imagem: true } },
            },
          },
          review: {
            select: {
              id: true,
              rating: true,
              comment: true,
              photos: true,
              status: true,
              rejectionReason: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  if (!order) return null;
  return {
    ...order,
    subtotal: order.subtotal.toNumber(),
    valorFrete: order.valorFrete.toNumber(),
    total: order.total.toNumber(),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.variant.product.id,
      nome: item.variant.product.nome,
      imagem: item.variant.product.imagem,
      variante: item.variant.label,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario.toNumber(),
      review: item.review
        ? {
            ...item.review,
            createdAt: item.review.createdAt.toISOString(),
            updatedAt: item.review.updatedAt.toISOString(),
          }
        : null,
    })),
  };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      telefone: true,
      senhaHash: true,
      accounts: {
        where: { provider: { in: ["google", "facebook"] } },
        select: { provider: true },
      },
      orders: {
        where: {
          status: { not: "draft" },
          cpfCnpj: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { cpfCnpj: true },
      },
    },
  });

  if (!user) {
    throw new AccountServiceError("Usuário não encontrado", "USER_NOT_FOUND");
  }

  return {
    nome: user.name,
    email: user.email,
    telefone: user.telefone,
    cpfCnpj: user.orders[0]?.cpfCnpj ?? null,
    hasPassword: Boolean(user.senhaHash),
    connectedOAuthProviders: user.accounts
      .map((account) => account.provider)
      .filter(
        (provider): provider is "google" | "facebook" =>
          provider === "google" || provider === "facebook",
      ),
  };
}

export async function getMustChangePassword(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mustChangePassword: true },
  });
  return user?.mustChangePassword ?? false;
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
  const sessionsValidAfter = new Date();
  const result = await prisma.$transaction(async (transaction) => {
    const updateResult = await transaction.user.updateMany({
      where: { id: userId, senhaHash: user.senhaHash },
      data: {
        senhaHash,
        sessionsValidAfter,
        mustChangePassword: false,
      },
    });

    if (updateResult.count === 1) {
      await transaction.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: sessionsValidAfter },
      });
    }

    return updateResult;
  });

  if (result.count !== 1) {
    throw new AccountServiceError(
      "A senha foi alterada em outra sessão. Entre novamente e tente de novo.",
      "CURRENT_PASSWORD_INCORRECT",
    );
  }
}

export async function getAddressesByUser(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ padrao: "desc" }, { apelido: "asc" }, { id: "asc" }],
    select: addressSelect,
  });
}

type PurchasedAddressInput = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
};

const normalizeAddressPart = (value: string | null) =>
  (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

export async function savePurchasedAddressForUser(
  userId: string,
  input: PurchasedAddressInput,
) {
  const candidates = await prisma.address.findMany({
    where: {
      userId,
      cep: input.cep,
      numero: input.numero,
    },
    select: addressSelect,
  });
  const existingAddress = candidates.find(
    (address) =>
      normalizeAddressPart(address.logradouro) ===
        normalizeAddressPart(input.logradouro) &&
      normalizeAddressPart(address.complemento) ===
        normalizeAddressPart(input.complemento),
  );

  if (existingAddress) {
    return prisma.address.update({
      where: { id: existingAddress.id },
      data: {
        apelido: existingAddress.apelido || input.logradouro.slice(0, 40),
        bairro: input.bairro,
        cidade: input.cidade,
        uf: input.uf,
      },
      select: addressSelect,
    });
  }

  const addressCount = await prisma.address.count({ where: { userId } });
  return prisma.address.create({
    data: {
      userId,
      apelido: input.logradouro.slice(0, 40),
      cep: input.cep,
      logradouro: input.logradouro,
      numero: input.numero,
      complemento: input.complemento,
      bairro: input.bairro,
      cidade: input.cidade,
      uf: input.uf,
      padrao: addressCount === 0,
    },
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
