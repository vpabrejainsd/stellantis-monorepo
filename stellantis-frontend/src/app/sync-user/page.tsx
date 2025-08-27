import { db } from "@/server/db";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

export default async function syncUserPage() {
  const { userId } = await auth();
  if (!userId) throw new Error("User Not Found");
  // Kick off user sync in parallel but don't await
  void (async () => {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      if (!user.emailAddresses?.length) return;
      await db.user.upsert({
        where: { email: user.emailAddresses[0]?.emailAddress ?? "" },
        update: {
          email: user.emailAddresses[0]?.emailAddress ?? "",
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
        },
        create: {
          id: userId,
          email: user.emailAddresses[0]?.emailAddress ?? "",
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
        },
      });
    } catch (err) {
      console.error("User sync failed:", err);
    }
  })();

  // Redirect immediately without waiting for user sync
  return redirect("/dashboard");
}
