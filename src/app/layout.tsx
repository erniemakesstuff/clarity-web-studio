import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@/lib/query-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import Link from "next/link";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clarity Menu",
  description: "AI-Powered Digital Menus and Marketing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased flex flex-col min-h-screen`}
      >
        <QueryClientProvider>
          <AuthProvider>
            <div className="flex-grow">{children}</div>
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
        <Button
          asChild
          className="fixed bottom-4 left-4 z-50 shadow-lg"
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
      </body>
    </html>
  );
}
