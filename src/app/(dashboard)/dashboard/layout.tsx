
"use client";
import type { ReactNode } from "react";
import { useEffect } from "react";
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
  SidebarRail,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Utensils, BarChart, LogOut, Settings, UserCircle, ChevronDown, Building, FlaskConical, PlusCircle, Sparkles } from "lucide-react";
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

const ADMIN_USER_RAW_IDS = ["admin@example.com", "valerm09@gmail.com"]; // Define admin users

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    logout,
    menuInstances,
    selectedMenuInstance,
    selectMenuInstance,
    isLoadingMenuInstances,
    rawOwnerId, // Get rawOwnerId for conditional rendering
  } = useAuth();

  const pathname = usePathname_();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace("/signin");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  if (isAuthLoading || !isAuthenticated) {
    return <div className="flex h-screen items-center justify-center"><p>Loading...</p></div>;
  }
  
  const isActualAdmin = ADMIN_USER_RAW_IDS.includes(rawOwnerId || "");

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: <LayoutDashboard /> },
    { href: "/dashboard/menu-management", label: "Menu Management", icon: <Utensils /> },
    { href: "/dashboard/analytics", label: "Analytics", icon: <BarChart /> },
    { href: "/dashboard/experiments", label: "Experiments", icon: <FlaskConical /> },
    { href: "/dashboard/content-generation", label: "Marketing Assistant", icon: <Sparkles /> },
    { href: "/dashboard/settings", label: "Settings", icon: <Settings /> },
  ];

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
                    {menuInstances.map((menu, index) => (
                      <DropdownMenuItem
                        key={`${menu.id}-${index}`}
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
                        {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || "User avatar"} />}
                        <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                      </Avatar>
                  </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{user?.displayName || "Admin User"}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isActualAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/settings">
                          <UserCircle className="mr-2 h-4 w-4" /> Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/settings">
                          <Settings className="mr-2 h-4 w-4" /> Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
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
