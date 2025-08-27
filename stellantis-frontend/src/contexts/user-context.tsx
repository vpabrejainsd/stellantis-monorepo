"use client";

import { createContext, useContext } from "react";
import type { User } from "@/lib/types";

export type UserContextType = {
  user: User | null; // null before loaded
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({
  user,
  refreshUser,
  children,
}: {
  user: User | null;
  refreshUser: () => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <UserContext.Provider value={{ user, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return ctx;
}
