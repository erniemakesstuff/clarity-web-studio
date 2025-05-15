"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/common/Logo";
import Link from "next/link";
import { Mail, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isAuthenticated, isLoading } = useAuth(); // Assuming sign up also logs in
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>;
  }

  // If already authenticated and not loading, the useEffect above will handle redirection.
  // We can return null here to prevent rendering the signup form if redirection is imminent.
  if (isAuthenticated) {
    return null; 
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
    }

    // Mock sign-up logic
    console.log("Mock sign up with:", { email, password });
    // Simulate successful signup & login
    login(); 
    toast({
      title: "Account Created!",
      description: "You have successfully signed up.",
      variant: "default",
      className: "bg-green-500 text-white"
    });
    // No need to router.push here, the useEffect will handle it when isAuthenticated changes.
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-6">
          <Logo size="lg" />
        </div>
        <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
        <CardDescription>Join Clarity Menu to manage your restaurant.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pl-10"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Sign Up
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Button variant="link" className="p-0 h-auto" asChild>
            <Link href="/signin">Sign In</Link>
          </Button>
        </p>
        <Button variant="link" className="p-0 h-auto text-sm" asChild>
             <Link href="/">Back to Homepage</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
