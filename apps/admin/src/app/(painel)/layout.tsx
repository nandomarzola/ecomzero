import type { ReactNode } from "react";
import AdminShell from "@/components/layout/AdminShell";

// Layout do grupo (painel): tudo aqui dentro é o admin autenticado, envolto no
// AdminShell (sidebar + header). O middleware já garante que só chega aqui com
// sessão válida. A tela de /login vive fora deste grupo, em (auth)/, sem shell.
export default function PainelLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
