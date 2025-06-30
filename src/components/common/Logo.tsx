
import { Zap } from "lucide-react"; 
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ size = "md", className }: { size?: "sm" | "md" | "lg", className?: string }) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <Zap className="text-primary group-hover:animate-pulse shrink-0" size={size === "sm" ? 20 : size === "lg" ? 32 : 28} />
      <h1 className={cn(
        `font-bold ${sizeClasses[size]} text-foreground group-hover:text-primary transition-colors group-data-[collapsible=icon]:hidden whitespace-nowrap`,
        className
      )}>
        Clarity Menu
      </h1>
    </Link>
  );
}
