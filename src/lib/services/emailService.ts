import { config } from "@/lib/config";
import { prisma } from "@/lib/db";

export type TransactionalEmailKind =
  | "password_reset"
  | "checkout_temporary_password"
  | "admin_login_code"
  | "welcome"
  | "payment_confirmed"
  | "order_in_transit"
  | "order_delivered";

export type EmailBranding = {
  storeName: string;
  logoUrl: string;
  brandColor: string;
};

export type EmailSendResult =
  | { status: "sent"; providerMessageId: string | null }
  | { status: "skipped"; reason: "not_configured" }
  | { status: "failed"; reason: string };

type SendTransactionalEmailInput = {
  kind: TransactionalEmailKind;
  from: string | undefined;
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
};

type BrandedEmailContent = {
  branding: EmailBranding;
  heading: string;
  message: string;
  highlight?: string;
  action?: { label: string; url: string };
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

function maskedEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "destinatário-inválido";
  return `${localPart.charAt(0)}***@${domain}`;
}

function absoluteStoreUrl(pathOrUrl: string): string {
  try {
    const url = new URL(pathOrUrl, config.storefrontUrl);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : config.storefrontUrl;
  } catch {
    return config.storefrontUrl;
  }
}

export function emailBrandingFromSettings(settings: {
  nomeLoja: string;
  logoUrl: string;
  corPrincipal: string;
}): EmailBranding {
  return {
    storeName: settings.nomeLoja,
    logoUrl: absoluteStoreUrl(settings.logoUrl),
    brandColor: /^#[0-9a-fA-F]{6}$/.test(settings.corPrincipal)
      ? settings.corPrincipal
      : "#A9EC17",
  };
}

export async function getEmailBranding(): Promise<EmailBranding> {
  const settings = await prisma.storeSettings.findUnique({
    where: { id: "singleton" },
    select: { nomeLoja: true, logoUrl: true, corPrincipal: true },
  });

  return emailBrandingFromSettings({
    nomeLoja: settings?.nomeLoja ?? "EcomZero",
    logoUrl: settings?.logoUrl ?? "/images/logo2.png",
    corPrincipal: settings?.corPrincipal ?? "#A9EC17",
  });
}

export function renderBrandedEmail(content: BrandedEmailContent): {
  html: string;
  text: string;
} {
  const storeName = escapeHtml(content.branding.storeName);
  const logoUrl = escapeHtml(content.branding.logoUrl);
  const heading = escapeHtml(content.heading);
  const message = escapeHtml(content.message).replace(/\r?\n/g, "<br>");
  const highlight = content.highlight
    ? `<tr><td style="padding:4px 32px 20px"><div style="padding:18px 20px;border:1px solid #dddddd;border-radius:8px;background:#fafafa;text-align:center;font-size:30px;font-weight:800;letter-spacing:0.25em;color:#111111">${escapeHtml(content.highlight)}</div></td></tr>`
    : "";
  const brandColor = content.branding.brandColor;
  const action = content.action
    ? `<tr><td style="padding:8px 32px 32px"><a href="${escapeHtml(content.action.url)}" style="display:inline-block;background:${brandColor};color:#050505;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:6px">${escapeHtml(content.action.label)}</a></td></tr>`
    : "";
  const actionText = content.action
    ? `\n\n${content.action.label}: ${content.action.url}`
    : "";

  return {
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f4f4;font-family:Arial,sans-serif;color:#171717"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f4;padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden"><tr><td style="background:#0b0b0b;padding:22px 32px;border-bottom:4px solid ${brandColor}"><img src="${logoUrl}" alt="${storeName}" style="display:block;max-height:46px;max-width:190px;width:auto;height:auto"></td></tr><tr><td style="padding:32px 32px 12px"><h1 style="margin:0;font-size:24px;line-height:1.3;color:#111111">${heading}</h1></td></tr><tr><td style="padding:8px 32px 24px;font-size:16px;line-height:1.65;color:#444444">${message}</td></tr>${highlight}${action}<tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #eeeeee;font-size:12px;line-height:1.5;color:#777777">Este é um e-mail automático de ${storeName}.</td></tr></table></td></tr></table></body></html>`,
    text: `${content.heading}\n\n${content.message}${content.highlight ? `\n\n${content.highlight}` : ""}${actionText}\n\n${content.branding.storeName}`,
  };
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<EmailSendResult> {
  const apiKey = config.email.resendApiKey;
  const logContext = {
    kind: input.kind,
    to: maskedEmail(input.to),
    idempotencyKey: input.idempotencyKey ?? null,
  };

  if (!apiKey || !input.from) {
    console.warn("[email] envio ignorado: Resend não configurado", logContext);
    return { status: "skipped", reason: "not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(input.idempotencyKey
          ? { "Idempotency-Key": input.idempotencyKey }
          : {}),
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const reason = `resend_http_${response.status}`;
      console.error("[email] falha no envio", { ...logContext, reason });
      return { status: "failed", reason };
    }

    const payload = (await response.json().catch(() => null)) as
      | { id?: unknown }
      | null;
    const providerMessageId =
      typeof payload?.id === "string" ? payload.id : null;

    console.info("[email] envio concluído", {
      ...logContext,
      providerMessageId,
    });
    return { status: "sent", providerMessageId };
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown_error";
    console.error("[email] falha no envio", { ...logContext, reason });
    return { status: "failed", reason };
  }
}

export async function sendPasswordResetEmail(input: {
  userId: string;
  requestId: string;
  to: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<EmailSendResult> {
  try {
    const branding = await getEmailBranding();
    const content = renderBrandedEmail({
      branding,
      heading: "Redefina sua senha",
      message: `Olá, ${input.name}. Recebemos uma solicitação para redefinir sua senha. O link expira em ${input.expiresInMinutes} minutos e só pode ser usado uma vez. Se você não solicitou a alteração, ignore este e-mail.`,
      action: { label: "Redefinir minha senha", url: input.resetUrl },
    });

    return sendTransactionalEmail({
      kind: "password_reset",
      from: config.email.securityFrom,
      to: input.to,
      subject: `Redefina sua senha da ${branding.storeName}`,
      html: content.html,
      text: content.text,
      idempotencyKey: `password-reset/${input.userId}/${input.requestId}`,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown_error";
    console.error("[email] falha ao preparar recuperação de senha", {
      kind: "password_reset",
      to: maskedEmail(input.to),
      reason,
    });
    return { status: "failed", reason };
  }
}

export async function sendCheckoutTemporaryPasswordEmail(input: {
  userId: string;
  to: string;
  name: string;
  temporaryPassword: string;
}): Promise<EmailSendResult> {
  try {
    const branding = await getEmailBranding();
    const content = renderBrandedEmail({
      branding,
      heading: "Sua conta foi criada",
      message: `Olá, ${input.name}. Criamos sua conta durante o checkout. Use a senha temporária abaixo em seus próximos acessos. Você pode alterá-la a qualquer momento em Minha Conta. Não compartilhe esta senha.`,
      highlight: input.temporaryPassword,
      action: {
        label: "Acessar Minha Conta",
        url: absoluteStoreUrl("/conta/dados"),
      },
    });

    return sendTransactionalEmail({
      kind: "checkout_temporary_password",
      from: config.email.securityFrom,
      to: input.to,
      subject: `Sua senha temporária da ${branding.storeName}`,
      html: content.html,
      text: content.text,
      idempotencyKey: `checkout-temporary-password/${input.userId}`,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown_error";
    console.error("[email] falha ao preparar senha temporária do checkout", {
      kind: "checkout_temporary_password",
      userId: input.userId,
      reason,
    });
    return { status: "failed", reason };
  }
}

export async function sendAdminLoginCodeEmail(input: {
  to: string;
  code: string;
  challengeId: string;
  requestId: string;
  expiresInMinutes: number;
}): Promise<EmailSendResult> {
  try {
    const branding = await getEmailBranding();
    const content = renderBrandedEmail({
      branding,
      heading: "Código de acesso ao Admin",
      message: `Use o código abaixo para confirmar seu acesso ao painel administrativo. Ele expira em ${input.expiresInMinutes} minutos e só pode ser usado uma vez. Se você não tentou entrar, ignore este e-mail.`,
      highlight: input.code,
    });

    return sendTransactionalEmail({
      kind: "admin_login_code",
      from: config.email.securityFrom,
      to: input.to,
      subject: `Seu código de acesso ao Admin ${branding.storeName}`,
      html: content.html,
      text: content.text,
      idempotencyKey: `admin-login-code/${input.challengeId}/${input.requestId}`,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown_error";
    console.error("[email] falha ao preparar código de acesso do admin", {
      kind: "admin_login_code",
      to: maskedEmail(input.to),
      challengeId: input.challengeId,
      reason,
    });
    return { status: "failed", reason };
  }
}
