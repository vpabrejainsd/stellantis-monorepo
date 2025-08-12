"use client";

import AppSidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/dynamic-header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useUser } from "@/hooks/use-user";
import { UserProvider } from "@/contexts/user-context";
import SyncLoader from "../shared/loader";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const { user, loading, refreshUser } = useUser();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <SyncLoader color="#243984" />
      </div>
    );
  }

  return (
    <UserProvider user={user} refreshUser={refreshUser}>
      <SidebarProvider suppressHydrationWarning>
        {!user ? (
          <SyncLoader color="#243984" />
        ) : (
          <div className="flex h-screen w-full overflow-hidden">
            <AppSidebar userRole={user.role} engineerId={user.engineer_id!} />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header />
              <main className="bg-muted/40 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                {children}
              </main>
            </div>
          </div>
        )}
      </SidebarProvider>
    </UserProvider>
  );
}
