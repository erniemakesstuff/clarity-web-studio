
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Settings, Share2, KeyRound, Fingerprint, Store, Loader2, Edit, Save, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { patchMenuSettings } from "./actions";

export default function SettingsPage() {
  const { selectedMenuInstance, ownerId, isLoadingMenuInstances, refreshMenuInstances, user } = useAuth();
  const { toast } = useToast();

  const [keyphraseInput, setKeyphraseInput] = useState("");
  const [isEditingKeyphrase, setIsEditingKeyphrase] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedMenuInstance) {
      setKeyphraseInput(selectedMenuInstance.keyphrase || "");
      setIsEditingKeyphrase(false);
    }
  }, [selectedMenuInstance]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: `${fieldName} has been copied.`,
    });
  };

  const handleSaveKeyphrase = async () => {
    if (!selectedMenuInstance) {
      toast({ title: "Error", description: "No menu selected.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Authentication Error", description: "User not found. Please try logging in again.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);

    try {
      const token = await user.getIdToken(true); // Force refresh to get a fresh token
      console.log("CLIENT-SIDE: Fresh JWT to be sent:", token); // Client-side log for you to see

      const result = await patchMenuSettings({
        ownerId,
        menuId: selectedMenuInstance.id,
        payload: { keyphrase: keyphraseInput },
        jwtToken: token,
      });
      
      if (result.success) {
        toast({
          title: "Keyphrase Updated",
          description: "Your keyphrase has been saved successfully.",
          variant: 'default',
          className: 'bg-green-500 text-white',
        });
        await refreshMenuInstances();
        setIsEditingKeyphrase(false);
      } else {
        toast({
          title: "Update Failed",
          description: result.message || "Could not save the keyphrase.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
       toast({
          title: "Error",
          description: `An unexpected error occurred: ${error.message}`,
          variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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
  const originalKeyphrase = selectedMenuInstance.keyphrase || "";

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
              <Input 
                id="keyphrase"
                value={keyphraseInput} 
                onChange={(e) => setKeyphraseInput(e.target.value)}
                readOnly={!isEditingKeyphrase || isSaving}
                className="font-mono bg-background read-only:bg-secondary read-only:focus-visible:ring-0" 
                placeholder="No keyphrase set..."
              />
              {isEditingKeyphrase ? (
                <>
                  <Button onClick={handleSaveKeyphrase} disabled={isSaving || keyphraseInput === originalKeyphrase} size="icon">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span className="sr-only">Save</span>
                  </Button>
                   <Button variant="ghost" size="icon" onClick={() => { setIsEditingKeyphrase(false); setKeyphraseInput(originalKeyphrase); }} disabled={isSaving}>
                    <X className="h-4 w-4" />
                     <span className="sr-only">Cancel</span>
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditingKeyphrase(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => handleCopy(keyphraseInput, "Keyphrase")} disabled={!keyphraseInput}>
                Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
