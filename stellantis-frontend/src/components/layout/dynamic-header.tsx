"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamically import the Header component with SSR turned off.
// This means it will only render on the client side.
const Header = dynamic(
  () => import("@/components/layout/header"), // Make sure this path is correct
  {
    // A loading fallback will be shown on the server and during initial client load.
    loading: () => (
      <header className="bg-background sticky top-0 z-30 flex h-14 items-center gap-4 border-b px-4 lg:h-[60px] lg:px-6">
        {/* Skeleton mimics the layout of the real header */}
        <Skeleton className="h-9 w-9" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </header>
    ),
    ssr: false,
  },
);

export default Header;
