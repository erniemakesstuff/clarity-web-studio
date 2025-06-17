
"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname as usePathname_ } from "next/navigation";
import { useRouter } from "next/navigation";
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
  SidebarRail, // Added SidebarRail import
} from "@/components/ui/sidebar";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { LayoutDashboard, Utensils, FileText, BarChart, LogOut, Settings, UserCircle, ChevronDown, Building, FlaskConical, PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

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
  { href: "/dashboard/hypothesis-tests", label: "Hypothesis Tests", icon: <FlaskConical /> },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { 
    isAuthenticated, 
    isLoading: isAuthLoading, 
    logout,
    menuInstances, 
    selectedMenuInstance, 
    selectMenuInstance, 
    isLoadingMenuInstances 
  } = useAuth();
  const { isLoading: isRedirecting } = useAuthRedirect(); 
  const pathname = usePathname_();
  const router = useRouter();

  if (isAuthLoading || isRedirecting || isLoadingMenuInstances) {
    return <div className="flex h-screen items-center justify-center"><p>Loading dashboard...</p></div>;
  }

  if (!isAuthenticated) {
    // This should ideally be handled by useAuthRedirect, but as a fallback:
    return <div className="flex h-screen items-center justify-center"><p>Redirecting to login...</p></div>;
  }
  
  const pageTitle = navItems.find(item => pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href)))?.label || "Dashboard";

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
      <SidebarRail /> 
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-background px-6 shadow-sm">
            <div className="md:hidden">
                 <SidebarTrigger />
            </div>
            <div className="flex-1">
                <h1 className="text-xl font-semibold truncate">
                    {selectedMenuInstance ? `${selectedMenuInstance.name} - ` : menuInstances.length === 0 ? 'No Menu - ' : 'Select Menu - '} {pageTitle}
                </h1>
            </div>

            <div className="flex items-center gap-3">
              {isLoadingMenuInstances ? (
                <Skeleton className="h-9 w-36 rounded-md" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span className="truncate max-w-[150px]">
                        {selectedMenuInstance ? selectedMenuInstance.name : menuInstances.length === 0 ? "No Menus" : "Select Menu"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      {menuInstances.length > 0 ? "Switch Menu" : "No Menus Available"}
                    </DropdownMenuLabel>
                    {menuInstances.length > 0 && <DropdownMenuSeparator key="separator-before-menu-items"/>}
                    {menuInstances.map((menu) => ( 
                      <DropdownMenuItem
                        key={menu.id}
                        onSelect={() => selectMenuInstance(menu.id)} 
                        disabled={selectedMenuInstance?.id === menu.id}
                      >
                        {menu.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator key="separator-after-menu-items" />
                    <DropdownMenuItem key="create-new-menu" onSelect={() => router.push('/dashboard/onboarding/create-restaurant')}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create New Menu
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

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
            </div>
        </header>
        <main className="flex-1 p-6 overflow-auto bg-secondary/30">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

    