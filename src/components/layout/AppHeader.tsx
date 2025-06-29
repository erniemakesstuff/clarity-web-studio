
"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { User, LogOut, LayoutDashboard } from "lucide-react";

export function AppHeader() {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-4">
          {!isAuthenticated && (
            <Button variant="ghost" asChild>
              <Link href="/menu/JY2NyRbbjOosr7bDzQywJG7-BhQh29g-w6NQQoyr2k8/TESTMENU0">Demo Menu</Link>
            </Button>
          )}
          {isAuthenticated ? (
            <>
              <Button variant="outline" asChild>
                <Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
              </Button>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link href="/signin"><User className="mr-2 h-4 w-4" />Menu Portal</Link> 
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
