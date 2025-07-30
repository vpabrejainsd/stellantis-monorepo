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
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
    <header className="bg-background sticky top-0 z-30 flex h-14 items-center gap-4 border-b px-4 lg:h-[60px] lg:px-6">
      <Button
        className="shrink-0 cursor-pointer md:hidden"
        onClick={() => toggleSidebar()}
        variant="outline"
        size="icon"
      >
        {/* A screen reader friendly way to describe the button's action */}
        <span className="sr-only">
          {open ? "Collapse sidebar" : "Expand sidebar"}
        </span>
        <Menu />
      </Button>
      {/* ADDED: Desktop Sidebar Toggle */}
      <div className="hidden w-full flex-1 md:block">
        <Button
          className="cursor-pointer"
          onClick={() => toggleSidebar()}
          variant="outline"
          size="icon"
        >
          {/* A screen reader friendly way to describe the button's action */}
          <span className="sr-only">
            {open ? "Collapse sidebar" : "Expand sidebar"}
          </span>
          {!open ? (
            <ArrowRightFromLineIcon className="h-5 w-5" />
          ) : (
            <ArrowLeftFromLineIcon className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* This pushes the UserButton to the right */}
      <div className="flex w-full justify-end md:w-auto">
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
