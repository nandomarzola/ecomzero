import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { ShippingOption } from "@/lib/services/shippingService";
import type { CheckoutInput } from "@/lib/validation/checkout";
import { CouponError, validateForCheckout } from "@/lib/services/couponService";
import { qualifiesForFreeShipping } from "@/lib/shippingPolicy";

export class CheckoutServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutServiceError";
  }
}

export type CreatedOrder = {
  orderId: string;
  status: "aguardando_pagamento";
  subtotal: number;
  valorFrete: number;
  descontoCupom: number;
  total: number;
};

function isShippingOption(value: unknown): value is ShippingOption {
  if (!value || typeof value !== "object") return false;
  const option = value as Record<string, unknown>;
  return (
    typeof option.id === "string" &&
    typeof option.transportadora === "string" &&
    typeof option.servico === "string" &&
    typeof option.preco === "number" &&
    Number.isFinite(option.preco) &&
    option.preco >= 0 &&
    typeof option.prazoDias === "number" &&
    Number.isFinite(option.prazoDias)
  );
}

export async function createOrderFromCart(
  sessionId: string,
  checkout: CheckoutInput,
  userId: string | null,
): Promise<CreatedOrder> {
  try {
    return await prisma.$transaction(
      async (transaction) => {
        const cart = await transaction.order.findFirst({
          where: { sessionId, status: "draft" },
          include: {
            items: {
              include: { variant: { include: { product: true } } },
            },
          },
        });

        if (!cart || cart.items.length === 0) {
          throw new CheckoutServiceError("Carrinho vazio ou não encontrado");
        }

        const unavailableProducts = [
          ...new Set(
            cart.items
              .filter((item) => !item.variant.product.ativo)
              .map((item) => item.variant.product.nome),
          ),
        ];

        if (unavailableProducts.length > 0) {
          throw new CheckoutServiceError(
            `Produtos indisponíveis no carrinho: ${unavailableProducts.join(", ")}`,
          );
        }

        const subtotal = cart.items.reduce(
          (total, item) =>
            total.plus(item.variant.precoPor.mul(item.quantidade)),
          new Prisma.Decimal(0),
        );

        const storeSettings = await transaction.storeSettings.findUnique({
          where: { id: "singleton" },
          select: { valorMinimoPedido: true },
        });
        const minimumOrderValue = storeSettings?.valorMinimoPedido ?? new Prisma.Decimal(0);
        if (minimumOrderValue.greaterThan(0) && subtotal.lessThan(minimumOrderValue)) {
          throw new CheckoutServiceError(
            `O valor mínimo do pedido é ${minimumOrderValue.toNumber().toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
          );
        }

        let descontoCupom = new Prisma.Decimal(0);
        let couponId: string | null = null;
        let couponGrantsFreeShipping = false;
        if (cart.couponId) {
          try {
            const applied = await validateForCheckout(transaction, {
              couponId: cart.couponId,
              orderId: cart.id,
              subtotal: subtotal.toNumber(),
              lines: cart.items.map((item) => ({
                productId: item.variant.product.id,
                categoryId: item.variant.product.categoryId,
                quantity: item.quantidade,
                unitPrice: item.variant.precoPor.toNumber(),
              })),
              shippingCost: 0,
              userId,
              email: checkout.email,
            });
            descontoCupom = new Prisma.Decimal(applied.descontoCupom);
            couponId = applied.couponId;
            couponGrantsFreeShipping = applied.freeShipping;
          } catch (couponError) {
            if (couponError instanceof CouponError) {
              throw new CheckoutServiceError(couponError.message);
            }
            throw couponError;
          }
        }

        const freeShipping = qualifiesForFreeShipping(
          subtotal.toNumber(),
          couponGrantsFreeShipping,
        );
        let quoteId: string | null = null;
        let optionId: string | null = null;
        let valorFrete = new Prisma.Decimal(0);
        let shippingService: string | null = null;
        let shippingEstimatedDays: number | null = null;

        if (!freeShipping) {
          if (!checkout.shippingQuoteId || !checkout.shippingOptionId) {
            throw new CheckoutServiceError(
              "Calcule e selecione uma opção de frete para continuar",
            );
          }

          const quote = await transaction.checkoutShippingQuote.findUnique({
            where: { id: checkout.shippingQuoteId },
          });

          if (!quote || quote.orderId !== cart.id || quote.cep !== checkout.cep) {
            throw new CheckoutServiceError(
              "Cotação de frete inválida, recalcule o frete",
            );
          }

          if (quote.expiresAt <= new Date()) {
            throw new CheckoutServiceError(
              "Cotação de frete expirada, recalcule o frete",
            );
          }

          const options = Array.isArray(quote.options)
            ? quote.options.filter(isShippingOption)
            : [];
          const selectedOption = options.find(
            (option) => option.id === checkout.shippingOptionId,
          );

          if (!selectedOption) {
            throw new CheckoutServiceError(
              "Opção de frete inválida, recalcule o frete",
            );
          }

          valorFrete = new Prisma.Decimal(selectedOption.preco).toDecimalPlaces(2);
          quoteId = quote.id;
          optionId = selectedOption.id;
          shippingService = selectedOption.servico;
          shippingEstimatedDays = selectedOption.prazoDias;
        }

        const total = subtotal.plus(valorFrete).minus(descontoCupom);

        for (const item of cart.items) {
          await transaction.orderItem.update({
            where: { id: item.id },
            data: { precoUnitario: item.variant.precoPor },
          });
        }

        const promoted = await transaction.order.updateMany({
          where: { id: cart.id, sessionId, status: "draft" },
          data: {
            status: "aguardando_pagamento",
            sessionId: null,
            userId,
            nomeCliente: checkout.nome,
            emailCliente: checkout.email,
            telefoneCliente: checkout.telefone,
            cpfCnpj: checkout.cpfCnpj,
            cepDestino: checkout.cep,
            logradouro: checkout.logradouro,
            numero: checkout.numero,
            complemento: checkout.complemento || null,
            bairro: checkout.bairro,
            cidade: checkout.cidade,
            uf: checkout.uf,
            subtotal,
            valorFrete,
            descontoCupom,
            couponId,
            total,
            shippingQuoteId: quoteId,
            shippingOptionId: optionId,
            shippingMode: freeShipping
              ? couponGrantsFreeShipping
                ? "free_shipping_coupon"
                : "free_shipping_threshold"
              : "melhor_envio",
            shippingProvider: freeShipping ? null : "melhor_envio",
            shippingService,
            shippingAmountCharged: valorFrete,
            shippingPayer: freeShipping ? "store" : "customer",
            shippingEstimatedDays,
          },
        });

        if (promoted.count !== 1) {
          throw new CheckoutServiceError("Carrinho já foi finalizado");
        }

        return {
          orderId: cart.id,
          status: "aguardando_pagamento",
          subtotal: subtotal.toNumber(),
          valorFrete: valorFrete.toNumber(),
          descontoCupom: descontoCupom.toNumber(),
          total: total.toNumber(),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof CheckoutServiceError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new CheckoutServiceError("Carrinho já foi finalizado");
    }
    throw error;
  }
}
