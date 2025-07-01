import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@/lib/query-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { HelpButton } from "@/components/layout/HelpButton";
import { ClarityAnalytics } from "@/components/analytics/ClarityAnalytics";

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
        <ClarityAnalytics />
        <QueryClientProvider>
          <AuthProvider>
            <div className="flex-grow">{children}</div>
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
        <HelpButton />
      </body>
    </html>
  );
}
