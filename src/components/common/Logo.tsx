
import { Zap } from "lucide-react"; // Using Zap as a placeholder for "Clarity"
import Link from "next/link";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <Zap className="text-primary group-hover:animate-pulse" size={size === "sm" ? 20 : size === "lg" ? 32 : 28} />
      <h1 className={`font-bold ${sizeClasses[size]} text-foreground group-hover:text-primary transition-colors`}>
        Clarity Menu
      </h1>
    </Link>
  );
}
