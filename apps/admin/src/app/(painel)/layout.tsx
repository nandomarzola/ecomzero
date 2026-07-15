import type { ReactNode } from "react";
import AdminShell from "@/components/layout/AdminShell";
import { auth } from "@/auth";

// Layout do grupo (painel): tudo aqui dentro é o admin autenticado, envolto no
// AdminShell (sidebar + header). O middleware já garante que só chega aqui com
// sessão válida. A tela de /login vive fora deste grupo, em (auth)/, sem shell.
export default async function PainelLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  return <AdminShell userLabel={session?.user?.email ?? "Administrador"}>{children}</AdminShell>;
}
