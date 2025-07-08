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
  CalendarClock,
} from "lucide-react";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar, // Import useSidebar hook
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

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

interface AppSidebarProps {
  userRole: string;
}

export default function AppSidebar({ userRole }: AppSidebarProps) {
  const pathname = usePathname();
  const navItems = managerNavItems;

  // Consume the state from the provider
  const { open, toggleSidebar } = useSidebar();

  return (
    // Remove variant="floating". The sidebar is now part of the document flow.
    // Use conditional classes to change the width based on the state.
    <Sidebar
      variant="inset"
      className={cn(
        "border-r transition-all duration-300 ease-in-out",
        open ? "w-64" : "w-20",
      )}
    >
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Wrench className="h-6 w-6 shrink-0" />
          {/* Conditionally render the brand name */}
          {open && <span className="text-lg">Stellantis Garage</span>}
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
                  {/* Conditionally render the label */}
                  {open && <span>{item.label}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
