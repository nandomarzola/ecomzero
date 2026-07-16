"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function AdminShell({
  children,
  userLabel,
  logoUrl,
}: {
  children: ReactNode;
  userLabel: string;
  logoUrl: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505]">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        logoUrl={logoUrl}
      />

      <div
        className={`flex min-h-screen min-w-0 flex-col transition-[margin] duration-200 ${
          collapsed ? "lg:ml-[68px]" : "lg:ml-[204px]"
        }`}
      >
        <Header
          collapsed={collapsed}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onToggleCollapse={() => setCollapsed((value) => !value)}
          userLabel={userLabel}
          logoUrl={logoUrl}
        />
        <main className="flex-1 p-4 sm:p-5 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
