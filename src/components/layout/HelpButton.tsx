
"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { HelpCircle } from "lucide-react";

export function HelpButton() {
  const pathname = usePathname();
  const isMenuPage = pathname?.startsWith("/menu/");

  const variant = isMenuPage ? "outline" : "default";
  const className = cn(
    "fixed bottom-4 left-4 z-50 shadow-lg",
    isMenuPage && "border-white/20 bg-black/40 text-white/90 backdrop-blur-sm hover:bg-black/60"
  );

  return (
    <Button
      asChild
      variant={variant}
      className={className}
    >
      <Link
        href="https://docs.google.com/forms/d/e/1FAIpQLSeBbgwRYsWgT9syt5quFTh1dR2M2Z1D4SheX1PH868Yam2y5g/viewform?usp=header"
        target="_blank"
        rel="noopener noreferrer"
      >
        <HelpCircle className="mr-2 h-4 w-4" />
        Get Help
      </Link>
    </Button>
  );
}
