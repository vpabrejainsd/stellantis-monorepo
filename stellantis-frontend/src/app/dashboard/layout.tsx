import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
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

  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return <div>Setting up your account... Please refresh in a moment.</div>;
  }

  // The Server Component now renders the Client Component, passing data as props.
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
