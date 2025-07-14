// src/components/layout/dashboard-shell.tsx
"use client";

import type { User } from "@prisma/client";
import AppSidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
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
    <SidebarProvider>
      {/* The root is now a flex container to place sidebar and main content side-by-side */}
      <div className="flex h-screen w-full overflow-hidden">
        {/* The sidebar is now a direct child of the flex container */}
        <AppSidebar userRole={user.role} />

        {/* This div wraps the header and main content, taking up the remaining space */}
        <div className="flex flex-1 flex-col">
          {/* Header is made sticky to stay at the top */}
          <Header userRole={user.role} />

          {/* Main content area is scrollable independently */}
          <main className="bg-muted/40 flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
