import { auth } from "@/auth";

export type VerifiedAdmin = {
  id: string;
  email: string;
  role: "owner" | "staff";
};

export type AdminAuthorizationResult =
  | { ok: true; admin: VerifiedAdmin }
  | { ok: false; error: string };

export async function requireVerifiedAdmin(
  options: { owner?: boolean } = {},
): Promise<AdminAuthorizationResult> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }
  if (!user.twoFactorEnabled) {
    return { ok: false, error: "Ative a autenticação em dois fatores para continuar." };
  }
  if (options.owner && user.role !== "owner") {
    return { ok: false, error: "Esta ação é restrita ao proprietário da loja." };
  }
  return {
    ok: true,
    admin: { id: user.id, email: user.email, role: user.role },
  };
}
