"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual"),
  newPassword: z.string().min(10, "A nova senha deve ter pelo menos 10 caracteres").max(128),
  confirmPassword: z.string(),
}).superRefine((input, context) => {
  if (!/[a-z]/.test(input.newPassword) || !/[A-Z]/.test(input.newPassword) || !/\d/.test(input.newPassword)) {
    context.addIssue({ code: "custom", path: ["newPassword"], message: "Use letra maiúscula, minúscula e número" });
  }
  if (input.newPassword !== input.confirmPassword) {
    context.addIssue({ code: "custom", path: ["confirmPassword"], message: "A confirmação da nova senha não confere" });
  }
  if (input.currentPassword === input.newPassword) {
    context.addIssue({ code: "custom", path: ["newPassword"], message: "A nova senha deve ser diferente da atual" });
  }
});

export async function changeAdminPasswordAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !(await bcrypt.compare(parsed.data.currentPassword, admin.senhaHash))) {
    return { ok: false, error: "A senha atual está incorreta." };
  }

  const senhaHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.adminUser.update({ where: { id: admin.id }, data: { senhaHash } });
  return { ok: true };
}
