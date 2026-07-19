"use server";

import { signIn } from "@/lib/auth";
import {
  clientIp,
  isRateLimited,
  rateLimitKey,
  registerAttempt,
} from "@/lib/security/authRateLimit";
import {
  AuthServiceError,
  registerCheckoutUser,
} from "@/lib/services/authService";
import { checkoutRegisterSchema } from "@/lib/validation/auth";

const CHECKOUT_REGISTER_MAX_PER_IP = 5;
const CHECKOUT_REGISTER_MAX_PER_EMAIL = 3;

export type CheckoutRegistrationActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      field?: "nome" | "email" | "telefone";
      accountCreated?: boolean;
    };

export async function registerCheckoutAccountAction(
  input: unknown,
): Promise<CheckoutRegistrationActionResult> {
  const parsed = checkoutRegisterSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    return {
      ok: false,
      error: issue?.message ?? "Revise os dados informados.",
      field:
        field === "nome" || field === "email" || field === "telefone"
          ? field
          : undefined,
    };
  }

  const ipKey = rateLimitKey("checkout-registro-ip", await clientIp());
  const emailKey = rateLimitKey(
    "checkout-registro-email",
    parsed.data.email,
  );
  if (
    (await isRateLimited(ipKey, CHECKOUT_REGISTER_MAX_PER_IP)) ||
    (await isRateLimited(emailKey, CHECKOUT_REGISTER_MAX_PER_EMAIL))
  ) {
    return {
      ok: false,
      error: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    };
  }
  await Promise.all([registerAttempt(ipKey), registerAttempt(emailKey)]);

  let accountCreated = false;
  try {
    const registration = await registerCheckoutUser(parsed.data);
    accountCreated = true;
    const redirectUrl = await signIn("credentials", {
      email: registration.user.email,
      senha: registration.temporaryPassword,
      redirect: false,
      redirectTo: "/checkout",
    });

    if (
      typeof redirectUrl !== "string" ||
      new URL(redirectUrl, "https://www.ecomzero.com.br").searchParams.has(
        "error",
      )
    ) {
      return {
        ok: false,
        accountCreated: true,
        error:
          "Sua conta foi criada e a senha temporária foi enviada, mas não foi possível entrar automaticamente. Use a senha recebida na aba Já sou cliente.",
      };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return {
        ok: false,
        error: error.message,
        field:
          error.code === "EMAIL_ALREADY_REGISTERED" ? "email" : undefined,
      };
    }

    if (accountCreated) {
      return {
        ok: false,
        accountCreated: true,
        error:
          "Sua conta foi criada e a senha temporária foi enviada, mas não foi possível entrar automaticamente. Use a senha recebida na aba Já sou cliente.",
      };
    }

    return {
      ok: false,
      error: "Não foi possível criar sua conta agora. Tente novamente.",
    };
  }
}
