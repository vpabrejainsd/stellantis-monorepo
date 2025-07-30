import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell"; // Import our new client component

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  // The Server Component now renders the Client Component, passing data as props.
  return <DashboardShell>{children}</DashboardShell>;
}
