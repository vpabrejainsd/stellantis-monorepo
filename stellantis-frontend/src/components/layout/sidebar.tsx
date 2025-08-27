// src/components/layout/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  PlusCircle,
  Wrench,
  Package,
  type LucideIcon,
  LayoutList,
  User,
} from "lucide-react";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar, // Import useSidebar hook
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Image from "next/image";

// ... (NavItem and navItems arrays remain the same) ...
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}
const managerNavItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/create-job", label: "Create Job", icon: PlusCircle },
  { href: "/dashboard/jobs", label: "All Jobs", icon: Package },
  { href: "/dashboard/engineers", label: "Engineers", icon: Wrench },
];

export default function AppSidebar({
  userRole,
  engineerId,
}: {
  userRole: "manager" | "engineer";
  engineerId: string;
}) {
  const engineerNavItems: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: Home },
    {
      href: `/dashboard/engineers/${engineerId}`,
      label: "Profile",
      icon: User,
    },
  ];
  const pathname = usePathname();
  const navItems = userRole === "manager" ? managerNavItems : engineerNavItems;

  // Consume the state from the provider
  const { open } = useSidebar();

  return (
    // Remove variant="floating". The sidebar is now part of the document flow.
    // Use conditional classes to change the width based on the state.
    <Sidebar
      variant="inset"
      // CHANGED: Hide on mobile (under md), show as flex column on md and up.
      // The width transition logic now only applies to md+ screens.
      className={cn(
        "hidden border-r transition-all duration-300 ease-in-out md:flex",
        open ? "w-64" : "w-20",
      )}
    >
      <SidebarHeader>
        <Link
          href="/"
          className="flex h-16 w-full items-center gap-2 font-semibold"
        >
          {/* <Wrench className="h-6 w-6 shrink-0" />
          <span className="text-lg">Stellantis Garage</span> */}
          <Image
            src={"/stellantis-banner.jpg"}
            alt="Stellantis Garage"
            width={1000}
            height={600}
            className="h-auto w-full object-cover"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                variant="default"
                className="w-full justify-start"
                isActive={pathname === item.href}
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
