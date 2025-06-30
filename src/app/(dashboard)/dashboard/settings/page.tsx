
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Settings, Share2, KeyRound, Fingerprint, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { selectedMenuInstance, ownerId, isLoadingMenuInstances } = useAuth();
  const { toast } = useToast();

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: `${fieldName} has been copied.`,
    });
  };

  if (isLoadingMenuInstances) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage digital menu settings and sharing options.
          </p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedMenuInstance) {
    return (
      <>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <Alert className="mt-4">
          <Settings className="h-4 w-4" />
          <AlertTitle>No Menu Selected</AlertTitle>
          <AlertDescription>
            Please select a menu from the dropdown in the header to view its settings.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const menuId = selectedMenuInstance.id;
  const keyphrase = selectedMenuInstance.keyphrase || "No keyphrase set for this menu.";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage digital menu settings and sharing options.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Share2 className="mr-3 h-7 w-7 text-primary" />
            Share Menu With Others
          </CardTitle>
          <CardDescription>
            These are the unique identifiers for your currently selected digital menu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ownerId">Owner ID</Label>
            <div className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <Input id="ownerId" value={ownerId} readOnly className="font-mono bg-secondary" />
              <Button variant="outline" size="sm" onClick={() => handleCopy(ownerId, "Owner ID")}>
                Copy
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="menuId">Menu ID</Label>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <Input id="menuId" value={menuId} readOnly className="font-mono bg-secondary" />
              <Button variant="outline" size="sm" onClick={() => handleCopy(menuId, "Menu ID")}>
                Copy
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="keyphrase">Keyphrase</Label>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <Input id="keyphrase" value={keyphrase} readOnly className="font-mono bg-secondary" />
              <Button variant="outline" size="sm" onClick={() => handleCopy(keyphrase, "Keyphrase")} disabled={!selectedMenuInstance.keyphrase}>
                Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
