"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname as usePathname_ } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"; // Assuming this custom component exists and works
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { LayoutDashboard, Utensils, FileText, BarChart, LogOut, Settings, UserCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: <LayoutDashboard /> },
  { href: "/dashboard/menu-management", label: "Menu Management", icon: <Utensils /> },
  { href: "/dashboard/content-generation", label: "Marketing Content", icon: <FileText /> },
  { href: "/dashboard/analytics", label: "Analytics", icon: <BarChart /> },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { isLoading: isRedirecting } = useAuthRedirect(); // Handles redirection
  const pathname = usePathname_();

  if (isLoading || isRedirecting) {
    return <div className="flex h-screen items-center justify-center"><p>Loading dashboard...</p></div>;
  }

  if (!isAuthenticated) {
    // This should ideally not be reached if useAuthRedirect works correctly,
    // but serves as a fallback.
    return <div className="flex h-screen items-center justify-center"><p>Redirecting to login...</p></div>;
  }
  
  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r bg-card">
        <SidebarHeader className="p-4 border-b">
          <Logo size="md" />
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href))}
                    className="w-full justify-start"
                    tooltip={item.label}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-background px-6 shadow-sm">
            <div className="md:hidden">
                 <SidebarTrigger />
            </div>
            <div className="flex-1">
                <h1 className="text-xl font-semibold">
                    {navItems.find(item => pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href)))?.label || "Dashboard"}
                </h1>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9">
                    <AvatarImage src="https://placehold.co/100x100.png" alt="User avatar" data-ai-hint="person avatar"/>
                    <AvatarFallback>AD</AvatarFallback>
                    </Avatar>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Admin User</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><UserCircle className="mr-2 h-4 w-4" /> Profile</DropdownMenuItem>
                <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
        <main className="flex-1 p-6 overflow-auto bg-secondary/30">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
