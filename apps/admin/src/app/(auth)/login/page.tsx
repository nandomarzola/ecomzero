import type { Metadata } from "next";
import AdminLoginFlow from "@/components/auth/AdminLoginFlow";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <AdminLoginFlow initialError={Boolean(error)} />;
}
