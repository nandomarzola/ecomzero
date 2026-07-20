import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AdminLoginFlow from "@/components/auth/AdminLoginFlow";
import { getAdminLoginRedirect } from "@/lib/security/adminRouteGuard";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const destination = getAdminLoginRedirect(session?.user);
  if (destination) redirect(destination);

  const { error } = await searchParams;
  return <AdminLoginFlow initialError={Boolean(error)} />;
}
