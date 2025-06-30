// src/components/layout/header.tsx
"use client";

import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import AppSidebar from "./sidebar"; // <-- Import our new AppSidebar

interface HeaderProps {
  userRole: string;
}

export default function Header({ userRole }: HeaderProps) {
  return (
    <header className="bg-background flex h-14 items-center gap-4 border-b px-4 lg:h-[60px] lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          {/* Reuse the AppSidebar component for the mobile menu content */}
          <AppSidebar userRole={userRole} />
        </SheetContent>
      </Sheet>

      <div className="w-full flex-1">
        {/* You can add a search bar or other header elements here */}
      </div>

      <UserButton afterSignOutUrl="/" />
    </header>
  );
}
