"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";

export function useUser() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_FLASK_API_URL}/users/${userId}`,
        { method: "GET", cache: "no-store" },
      );
      if (!res.ok) throw new Error("Failed to fetch user");
      const data: User = (await res.json()) as User;
      setUser(data);
    } catch (err) {
      console.error("Error fetching user:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      router.push("/sign-in");
      return;
    }
    void fetchUser();
  }, [isLoaded, userId, router, fetchUser]);

  return {
    user,
    loading,
    refreshUser: fetchUser,
  };
}
