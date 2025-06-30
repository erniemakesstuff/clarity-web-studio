"use client"; // Ensure this is a client component for hooks

import { ContentGeneratorForm } from "@/components/dashboard/ContentGeneratorForm";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth
import { AlertTriangle, Loader2 } from "lucide-react"; // For icons
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For access denied message

const ADMIN_USER_RAW_IDS = ["admin@example.com", "valerm09@gmail.com"];

export default function ContentGenerationPage() {
  const { rawOwnerId, isLoading: isAuthLoading } = useAuth(); // Get rawOwnerId and auth loading state

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading user data...</p>
      </div>
    );
  }

  const isActualAdmin = ADMIN_USER_RAW_IDS.includes(rawOwnerId || "");

  if (!isActualAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            This feature is currently under development and only available to administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Marketing Assistant</h1>
        <p className="text-muted-foreground">
          Leverage AI to get assistance with creating engaging blog posts, social media updates, or recipe ideas based on your menu. You'll then manually post the content.
        </p>
      </div>
      <ContentGeneratorForm />
    </div>
  );
}
