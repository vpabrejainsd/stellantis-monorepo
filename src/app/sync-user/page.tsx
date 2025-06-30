import { db } from "@/server/db";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

const syncUserPage = async () => {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User Not Found");
  }
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (!user.emailAddresses || user.emailAddresses.length === 0) {
    return notFound();
  }
  await db.user.upsert({
    where: {
      email: user.emailAddresses[0]?.emailAddress ?? "",
    },
    update: {
      email: user.emailAddresses[0]?.emailAddress ?? "",
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
    },
    create: {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? "",
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
    },
  });
  return redirect("/dashboard");
};

export default syncUserPage;
