"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  PlusCircle,
  Wrench,
  Package,
  type LucideIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"; // <-- Import from the newly added component

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const managerNavItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/create-job", label: "Create Job", icon: PlusCircle },
  { href: "/dashboard/jobs", label: "All Jobs", icon: Package },
];

const engineerNavItems: NavItem[] = [
  { href: "/dashboard", label: "My Jobs", icon: Wrench },
];

interface AppSidebarProps {
  userRole: string;
}

export default function AppSidebar({ userRole }: AppSidebarProps) {
  const pathname = usePathname();
  const navItems = managerNavItems;

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Wrench className="text-primary h-6 w-6" />
          <span className="text-lg">Stellantis Garage</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              {/* Use asChild to render a Next.js Link for proper navigation */}
              <SidebarMenuButton
                asChild
                variant="default"
                className="w-full justify-start"
                isActive={pathname === item.href}
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
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
