// src/components/layout/header.tsx
"use client";

import { UserButton } from "@clerk/nextjs";
import {
  ArrowLeftFromLineIcon,
  ArrowRightFromLineIcon,
  Hamburger,
  Menu,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import AppSidebar from "./sidebar";
import { Breadcrumb } from "../ui/breadcrumb";
import { useSidebar } from "../ui/sidebar";

interface HeaderProps {
  userRole: string;
}

export default function Header({ userRole }: HeaderProps) {
  const { open, toggleSidebar } = useSidebar();
  return (
    // Add `sticky top-0 z-10` to make the header stick to the top.
    // z-10 ensures it stays above the main content.
    <header className="bg-background sticky top-0 z-10 flex h-14 items-center gap-4 border-b px-2 lg:h-[60px] lg:px-6">
      {/* <Sheet> */}
      {/*   <SheetTrigger asChild> */}
      {/*     <Button variant="outline" size="icon" className="shrink-0 md:hidden"> */}
      {/*       <Menu className="h-5 w-5" /> */}
      {/*       <span className="sr-only">Toggle navigation menu</span> */}
      {/*     </Button> */}
      {/*   </SheetTrigger> */}
      {/*   <SheetContent side="left" className="flex flex-col p-0"> */}
      {/*     <AppSidebar userRole={userRole} /> */}
      {/*   </SheetContent> */}
      {/* </Sheet> */}
      <div className="w-full flex-1">
        <Button
          className="cursor-pointer"
          onClick={() => toggleSidebar()}
          variant="outline"
        >
          {!open ? <ArrowRightFromLineIcon /> : <ArrowLeftFromLineIcon />}
        </Button>
      </div>

      <UserButton afterSignOutUrl="/" />
    </header>
  );
}
