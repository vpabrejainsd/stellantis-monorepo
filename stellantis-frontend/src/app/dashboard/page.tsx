"use client";

import ManagerDashboard from "@/components/dashboard/manager-dashboard";
import EngineerDashboard from "@/components/dashboard/engineer-dashboard";
import { useUserContext } from "@/contexts/user-context";

export default function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const { user } = useUserContext();

  if (!user) return null; // Could add a fallback here

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return user.role === "manager" ? <ManagerDashboard /> : <EngineerDashboard />;
}
