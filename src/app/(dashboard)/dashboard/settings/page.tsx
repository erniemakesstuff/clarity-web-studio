
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { User, Share2, Fingerprint, Mail, Phone, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { grantMenuAccessToUser } from "./actions";

export default function SettingsPage() {
  const { user, selectedMenuInstance, selectedMenuOwnerId, jwtToken, isLoading } = useAuth();
  const { toast } = useToast();
  const [targetSub, setTargetSub] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: `${fieldName} has been copied.`,
    });
  };

  const handleShareSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!targetSub.trim()) {
      toast({ title: "Error", description: "Please enter a user SUB to grant access.", variant: "destructive" });
      return;
    }
    if (!selectedMenuInstance) {
        toast({ title: "Error", description: "You must have a menu selected to share.", variant: "destructive" });
        return;
    }

    setIsSharing(true);
    const grantToAdd = `${selectedMenuOwnerId}:${selectedMenuInstance.id}`;

    const result = await grantMenuAccessToUser({
      targetUserId: targetSub.trim(),
      grantToAdd,
      jwtToken,
    });

    if (result.success) {
      toast({
        title: "Access Granted",
        description: `Successfully shared "${selectedMenuInstance.name}" with user ${targetSub.trim()}.`,
        variant: "default",
        className: "bg-green-500 text-white"
      });
      setTargetSub(""); // Clear input on success
    } else {
      toast({
        title: "Failed to Grant Access",
        description: result.message || "An unknown error occurred.",
        variant: "destructive",
      });
    }
    setIsSharing(false);
  };
  
  const InfoRow = ({ icon, label, value, onCopy }: { icon: React.ReactNode, label: string, value: string, onCopy?: (value: string, label: string) => void }) => (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase().replace(/\s/g, '-')}>{label}</Label>
      <div className="flex items-center gap-2">
        {icon}
        <Input id={label.toLowerCase().replace(/\s/g, '-')} value={value} readOnly className="font-mono bg-secondary" />
        {onCopy && (
          <Button variant="outline" size="sm" onClick={() => onCopy(value, label)}>
            Copy
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          View your user details and manage menu sharing.
        </p>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <User className="mr-3 h-7 w-7 text-primary" />
            Your User Profile
          </CardTitle>
          <CardDescription>
            These are your current account details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
             <div className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
             </div>
          ) : user ? (
            <>
              <InfoRow 
                icon={<Fingerprint className="h-5 w-5 text-muted-foreground flex-shrink-0" />} 
                label="Identity SUB" 
                value={user.uid.toUpperCase()}
                onCopy={handleCopy}
              />
              <InfoRow 
                icon={<User className="h-5 w-5 text-muted-foreground flex-shrink-0" />} 
                label="Contact Name" 
                value={user.displayName || "Not set"}
              />
              <InfoRow 
                icon={<Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />} 
                label="Contact Email" 
                value={user.email || "Not set"}
              />
               <InfoRow 
                icon={<Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />} 
                label="Contact Phone" 
                value={user.phoneNumber || "Not set"}
              />
            </>
          ) : (
             <p className="text-muted-foreground">User details not available.</p>
          )}
        </CardContent>
      </Card>
      
      {selectedMenuInstance && (
        <Card className="shadow-lg">
          <form onSubmit={handleShareSubmit}>
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Share2 className="mr-3 h-7 w-7 text-primary" />
                Share Menu With Another User
              </CardTitle>
              <CardDescription>
                Grant another user access to the currently selected menu: <strong>{selectedMenuInstance.name}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="target-sub">Target User's Identity SUB</Label>
                <Input 
                  id="target-sub" 
                  value={targetSub}
                  onChange={(e) => setTargetSub(e.target.value)}
                  placeholder="Enter the full SUB of the user to grant access to"
                  className="font-mono"
                  disabled={isSharing}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button type="submit" disabled={isSharing || !targetSub.trim()}>
                {isSharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSharing ? 'Granting Access...' : 'Grant Access'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

    </div>
  );
}
