// src/components/layout/dashboard-shell.tsx
"use client";

import type { User } from "@prisma/client";
import AppSidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/dynamic-header";
import { SidebarProvider } from "@/components/ui/sidebar";

interface DashboardShellProps {
  user: User;
  children: React.ReactNode;
}

export default function DashboardShell({
  user,
  children,
}: DashboardShellProps) {
  return (
    <SidebarProvider suppressHydrationWarning>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar userRole={user.role} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header userRole={user.role} />

          <main className="bg-muted/40 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
