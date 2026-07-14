"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505]">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className={`flex min-h-screen min-w-0 flex-col transition-[margin] duration-200 ${
          collapsed ? "lg:ml-[72px]" : "lg:ml-[240px]"
        }`}
      >
        <Header
          collapsed={collapsed}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onToggleCollapse={() => setCollapsed((value) => !value)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
