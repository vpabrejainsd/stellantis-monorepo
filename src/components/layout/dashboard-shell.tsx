// src/components/layout/dashboard-shell.tsx
"use client";

import type { User } from "@prisma/client";
import AppSidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

// Import the SidebarProvider from the shadcn/ui component
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
    // Wrap the entire shell in the SidebarProvider.
    // This makes the sidebar's context available to all children,
    // including AppSidebar and its internal components.
    <SidebarProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="bg-muted/40 hidden border-r md:block">
          <AppSidebar userRole={user.role} />
        </div>

        <div className="flex flex-col">
          <Header userRole={user.role} />
          <main className="bg-muted/40 flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
